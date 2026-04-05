/*
Safe backfill script for Business.ownerId
Usage:
  node scripts/backfill-business-owners.js --file=path/to/mapping.json --dry-run
  node scripts/backfill-business-owners.js --file=path/to/mapping.csv

Mapping formats supported:
  JSON: [{ "businessId": "id", "ownerId": "user-id" }, ...]
  CSV: headers businessId,ownerId OR businessName,ownerId

Notes:
- Validates that owner user exists before applying updates.
- Runs in dry-run by default unless --apply is passed.
*/

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach((a) => {
    if (a === '--dry-run') out.dry = true;
    else if (a === '--apply') out.dry = false;
    else if (a.startsWith('--file=')) out.file = a.split('=')[1];
    else if (a === '--help') out.help = true;
  });
  if (typeof out.dry === 'undefined') out.dry = true; // default
  return out;
}

function printHelp() {
  console.log(
    'Usage: node scripts/backfill-business-owners.js --file=path/to/mapping.json [--apply | --dry-run]'
  );
  console.log(
    'Mapping formats: JSON array of {businessId, ownerId} or CSV with headers businessId,ownerId or businessName,ownerId'
  );
}

async function readMapping(file) {
  const buf = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(buf);
  }
  // simple CSV parse
  const lines = buf.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ? cols[i].trim() : '';
    });
    return obj;
  });
  return rows;
}

async function main() {
  const argv = parseArgs();
  if (argv.help || !argv.file) {
    printHelp();
    process.exit(1);
  }

  const mapping = await readMapping(argv.file);
  console.log(`Loaded ${mapping.length} mapping entries (dry-run=${argv.dry})`);

  const summary = { applied: 0, skipped: 0, errors: 0, missingUser: 0, missingBusiness: 0 };

  for (const entry of mapping) {
    const businessId = entry.businessId || null;
    const businessName = entry.businessName || null;
    const ownerId = entry.ownerId;

    if (!ownerId) {
      console.warn('Skipping entry with no ownerId:', entry);
      summary.skipped++;
      continue;
    }

    // Check owner exists
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      console.warn(`Owner not found: ${ownerId} — skipping`);
      summary.missingUser++;
      continue;
    }

    let business = null;
    if (businessId) {
      business = await prisma.business.findUnique({ where: { id: businessId } });
    } else if (businessName) {
      business = await prisma.business.findFirst({ where: { name: businessName } });
    } else {
      console.warn('Skipping entry with no businessId or businessName:', entry);
      summary.skipped++;
      continue;
    }

    if (!business) {
      console.warn('Business not found for entry:', entry);
      summary.missingBusiness++;
      continue;
    }

    if (business.ownerId === ownerId) {
      console.log(`No-op: business ${business.id} already has owner ${ownerId}`);
      summary.skipped++;
      continue;
    }

    if (argv.dry) {
      console.log(
        `[dry-run] Would update business ${business.id} ownerId: ${business.ownerId} -> ${ownerId}`
      );
      summary.applied++;
      continue;
    }

    try {
      await prisma.business.update({ where: { id: business.id }, data: { ownerId } });
      console.log(`Updated business ${business.id} ownerId -> ${ownerId}`);
      summary.applied++;
    } catch (err) {
      console.error('Failed to update', business.id, (err && err.message) || err);
      summary.errors++;
    }
  }

  console.log('Summary:', summary);
  await prisma.$disconnect();
  if (summary.errors > 0) process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed', err);
  process.exit(3);
});
