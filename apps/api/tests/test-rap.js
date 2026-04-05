/**
 * Test RAP endpoints: company overview and admin summary
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';

  console.log('Logging in as company@example.com');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;

  // Find seeded company/job/application
  const companyUser = await prisma.user.findUnique({ where: { email: 'company@example.com' } });
  if (!companyUser) throw new Error('Seed company user missing');
  const job = await prisma.job.findFirst({ where: { userId: companyUser.id } });
  if (!job) throw new Error('Seed job missing');
  const application = await prisma.jobApplication.findFirst({ where: { jobId: job.id } });
  if (!application) throw new Error('Seed application missing');

  // Create placement outcomes: HIRED and MONTH_1 to simulate retention
  const now = new Date();
  await prisma.placementOutcome.upsert({
    where: { applicationId_milestone: { applicationId: application.id, milestone: 'HIRED' } },
    update: { reachedAt: now },
    create: { applicationId: application.id, milestone: 'HIRED', reachedAt: now }
  });

  const later = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days later
  await prisma.placementOutcome.upsert({
    where: { applicationId_milestone: { applicationId: application.id, milestone: 'MONTH_1' } },
    update: { reachedAt: later },
    create: { applicationId: application.id, milestone: 'MONTH_1', reachedAt: later }
  });

  // Call company overview
  const res = await fetch(`${base}/rap/company/overview?days=90`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`Company RAP overview failed: ${res.status} ${b}`);
  }
  const j = await res.json();
  console.log('Company RAP overview:', j);
  if (!('placements' in j)) throw new Error('Unexpected overview payload');
  if (j.placements < 1) throw new Error('Expected at least 1 placement');
  if (j.month1RetentionPercent <= 0) console.warn('Retention is 0 — this might be okay in some cases');

  // Admin summary (skip if ADMIN_API_KEY not set)
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.log('ADMIN_API_KEY not set - skipping admin RAP summary live test. Set ADMIN_API_KEY to run this test.');
    return;
  }

  const adminRes = await fetch(`${base}/rap/admin/placements-summary?days=90`, { headers: { 'x-admin-key': adminKey } });
  if (!adminRes.ok) {
    const b = await adminRes.text();
    throw new Error(`Admin RAP summary failed: ${adminRes.status} ${b}`);
  }
  const aj = await adminRes.json();
  console.log('Admin placements summary:', JSON.stringify(aj, null, 2));
  if (!aj.total || aj.total < 1) throw new Error('Unexpected admin summary totals');

  console.log('RAP tests passed');
}

run().catch((err) => {
  console.error('test failed', err);
  process.exit(1);
});