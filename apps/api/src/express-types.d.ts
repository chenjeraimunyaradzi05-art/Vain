import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: User & {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

export {};
