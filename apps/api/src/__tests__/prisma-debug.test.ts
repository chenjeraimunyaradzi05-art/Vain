import { describe, it } from 'vitest';
import { prisma } from '../db';

describe('prisma debug', () => {
  it('inspects prisma job count', () => {
    // eslint-disable-next-line no-console
    console.log('prisma.job', Object.keys(prisma.job || {}));
    // eslint-disable-next-line no-console
    console.log('typeof prisma.job.count', typeof (prisma.job && (prisma.job as any).count));
    // eslint-disable-next-line no-console
    console.log('prisma.job.count.mock', (prisma.job && (prisma.job as any).count && (prisma.job as any).count.mock) || null);
  });
});
