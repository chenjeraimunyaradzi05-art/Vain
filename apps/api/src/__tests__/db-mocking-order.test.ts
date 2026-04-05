import { describe, it, vi } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    job: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

it('db mock resolution test', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const resolved = require.resolve('../db');
  console.log('resolved db path:', resolved);

  const { prisma } = await import('../db');
  console.log('imported prisma:', prisma);
  console.log('prisma.job:', (prisma as any).job);
  console.log('prisma.job.count type:', typeof (prisma as any).job?.count);
});
