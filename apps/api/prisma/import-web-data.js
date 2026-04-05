"use strict";

/**
 * Web data import (opt-in)
 *
 * Goal: allow importing non-PII public listings (jobs/courses) from APPROVED sources
 * (APIs/JSON feeds you have permission to use) and upsert them into the platform.
 *
 * Safety:
 * - No personal data ingestion (emails/phones/names) beyond organization/provider display names.
 * - Disabled by default in production unless ALLOW_WEB_IMPORT=1.
 * - Idempotent upserts based on stable IDs derived from source + externalId.
 *
 * Usage examples:
 *   node prisma/import-web-data.js --jobs-url https://example.com/jobs.json --source example
 *   node prisma/import-web-data.js --courses-url https://example.com/courses.json --source example
 *
 * Expected JSON formats (arrays):
 *   Jobs:    [{ externalId, title, description, location, employment, salaryLow, salaryHigh, companyName, companyIndustry, companyWebsite }]
 *   Courses: [{ externalId, title, description, category, duration, qualification, industry, providerName, providerId, priceInCents, location, isOnline, url, skills }]
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function stableId(prefix, source, externalId) {
  const key = `${prefix}:${source}:${externalId}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 24);
  return `${prefix}-${source}-${hash}`;
}

const fs = require("fs");
const path = require("path");

async function fetchJson(url, timeoutMs = 20000) {
  // Handle local file:// URLs or file paths
  if (url.startsWith("file://") || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    let filePath = url.startsWith("file://") ? url.slice(7) : url;
    // Handle Windows paths with drive letters (file:///C:/...)
    if (filePath.startsWith("/") && /^\/[A-Za-z]:/.test(filePath)) {
      filePath = filePath.slice(1);
    }
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a JSON array`);
  }
  return value;
}

function pickEmployment(raw) {
  const s = String(raw || "").toUpperCase();
  const allowed = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "CASUAL", "APPRENTICESHIP", "TRAINEESHIP"]);
  return allowed.has(s) ? s : "FULL_TIME";
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toBool(value) {
  if (value === true || value === false) return value;
  const s = String(value || "").toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return false;
}

async function ensureExternalCompanyUser({ source }) {
  // Use a dedicated company user so jobs have a valid userId owner.
  const email = `external-listings+${source}@ngurra.org.au`;

  let passwordHash = null;
  const envPassword = process.env.EXTERNAL_COMPANY_PASSWORD;

  if (envPassword) {
    passwordHash = await bcrypt.hash(envPassword, 12);
  } else {
    // Avoid creating a predictable credential.
    const random = crypto.randomBytes(24).toString("base64");
    passwordHash = await bcrypt.hash(random, 12);

    if (process.env.NODE_ENV !== "production") {
      console.log(`ℹ️  EXTERNAL_COMPANY_PASSWORD not set; generated non-reusable credential for ${email}`);
    }
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash, userType: "COMPANY" },
    create: { email, password: passwordHash, userType: "COMPANY" },
  });

  await prisma.companyProfile.upsert({
    where: { userId: user.id },
    update: {
      companyName: `External Listings (${source})`,
      industry: "External",
      city: "Australia",
    },
    create: {
      userId: user.id,
      companyName: `External Listings (${source})`,
      industry: "External",
      city: "Australia",
    },
  });

  return user;
}

async function importJobs({ url, source }) {
  if (!url) return { imported: 0 };

  console.log(`\n🌐 Importing jobs from: ${url}`);
  const payload = await fetchJson(url);
  const rows = ensureArray(payload, "jobs payload");

  const owner = await ensureExternalCompanyUser({ source });

  let imported = 0;
  for (const row of rows) {
    const externalId = String(row.externalId || row.id || row.slug || "").trim();
    const title = String(row.title || "").trim();
    const description = String(row.description || "").trim();

    if (!externalId || !title || !description) continue;

    const slug = slugify(`${title}-${source}-${externalId}`);

    await prisma.job.upsert({
      where: { slug },
      update: {
        title,
        description,
        location: row.location ? String(row.location) : null,
        employment: pickEmployment(row.employment),
        salaryLow: toInt(row.salaryLow),
        salaryHigh: toInt(row.salaryHigh),
        isActive: true,
      },
      create: {
        userId: owner.id,
        title,
        slug,
        description,
        location: row.location ? String(row.location) : null,
        employment: pickEmployment(row.employment),
        salaryLow: toInt(row.salaryLow),
        salaryHigh: toInt(row.salaryHigh),
        isActive: true,
      },
    });

    imported++;
  }

  console.log(`✅ Jobs imported/upserted: ${imported}`);
  return { imported };
}

async function importCourses({ url, source }) {
  if (!url) return { imported: 0 };

  console.log(`\n🌐 Importing courses from: ${url}`);
  const payload = await fetchJson(url);
  const rows = ensureArray(payload, "courses payload");

  let imported = 0;
  for (const row of rows) {
    const externalId = String(row.externalId || row.id || row.code || "").trim();
    const title = String(row.title || row.name || "").trim();

    if (!externalId || !title) continue;

    const id = stableId("ext-course", source, externalId);

    await prisma.course.upsert({
      where: { id },
      update: {
        title,
        description: row.description ? String(row.description) : null,
        category: row.category ? String(row.category) : null,
        duration: row.duration ? String(row.duration) : null,
        qualification: row.qualification ? String(row.qualification) : null,
        industry: row.industry ? String(row.industry) : null,
        providerId: row.providerId ? String(row.providerId) : null,
        providerName: row.providerName ? String(row.providerName) : `External (${source})`,
        priceInCents: toInt(row.priceInCents),
        location: row.location ? String(row.location) : null,
        isOnline: toBool(row.isOnline),
        isActive: true,
        skills: row.skills ? String(row.skills) : null,
        url: row.url ? String(row.url) : null,
        externalUrl: row.externalUrl ? String(row.externalUrl) : null,
      },
      create: {
        id,
        title,
        description: row.description ? String(row.description) : null,
        category: row.category ? String(row.category) : null,
        duration: row.duration ? String(row.duration) : null,
        qualification: row.qualification ? String(row.qualification) : null,
        industry: row.industry ? String(row.industry) : null,
        providerId: row.providerId ? String(row.providerId) : null,
        providerName: row.providerName ? String(row.providerName) : `External (${source})`,
        priceInCents: toInt(row.priceInCents),
        location: row.location ? String(row.location) : null,
        isOnline: toBool(row.isOnline),
        isActive: true,
        skills: row.skills ? String(row.skills) : null,
        url: row.url ? String(row.url) : null,
        externalUrl: row.externalUrl ? String(row.externalUrl) : null,
      },
    });

    imported++;
  }

  console.log(`✅ Courses imported/upserted: ${imported}`);
  return { imported };
}

async function main() {
  const args = parseArgs(process.argv);

  const source = String(args.source || process.env.WEB_IMPORT_SOURCE || "web").trim() || "web";
  const jobsUrl = args["jobs-url"] || process.env.WEB_IMPORT_JOBS_URL;
  const coursesUrl = args["courses-url"] || process.env.WEB_IMPORT_COURSES_URL;

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && String(process.env.ALLOW_WEB_IMPORT || "") !== "1") {
    throw new Error(
      "Refusing to import web data in production. Set ALLOW_WEB_IMPORT=1 if you explicitly intend this."
    );
  }

  if (!jobsUrl && !coursesUrl) {
    console.log("No URLs provided. Nothing to import.");
    console.log("Provide one or both:");
    console.log("  --jobs-url <https://.../jobs.json>");
    console.log("  --courses-url <https://.../courses.json>");
    process.exit(0);
  }

  const jobsResult = await importJobs({ url: jobsUrl, source });
  const coursesResult = await importCourses({ url: coursesUrl, source });

  console.log("\n🎉 Web import complete", { source, jobs: jobsResult, courses: coursesResult });
}

main()
  .catch((e) => {
    console.error("❌ Web import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
