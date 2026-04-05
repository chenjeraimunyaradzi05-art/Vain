/* Verify owner backfill status
Usage: node scripts/verify-owner-backfill.js
Exits with code 0 if checks pass (no businesses with null ownerId), non-zero otherwise.
*/
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const nullCountRes = await p.$queryRaw`SELECT COUNT(*)::int as c FROM "Business" WHERE "ownerId" IS NULL`;
    const nullCount = nullCountRes[0] ? nullCountRes[0].c : 0;
    const placeholderCountRes = await p.$queryRaw`SELECT COUNT(*)::int as c FROM "Business" WHERE "ownerId" = 'business_owner_placeholder'`;
    const placeholderCount = placeholderCountRes[0] ? placeholderCountRes[0].c : 0;
    const placeholderUser = await p.user.findUnique({ where: { id: 'business_owner_placeholder' } });

    console.log('Businesses with NULL ownerId:', nullCount);
    console.log('Businesses with placeholder owner:', placeholderCount);
    console.log('Placeholder user exists:', !!placeholderUser);

    if (nullCount === 0) {
      console.log('Verification passed: no businesses with NULL ownerId.');
      process.exit(0);
    }
    console.warn('Verification warning: some businesses still have NULL ownerId.');
    process.exit(2);
  } catch (err) {
    console.error('Verification failed', err && err.message || err);
    process.exit(3);
  } finally {
    await p.$disconnect();
  }
})();
