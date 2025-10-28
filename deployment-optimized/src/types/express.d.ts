import type { User } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

export {};

declare namespace Express {
  interface Request {
    user?: any | (User & { adminRole?: string; role?: string });
  }
}