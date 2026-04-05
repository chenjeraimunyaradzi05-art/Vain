import { Request, Response, NextFunction } from 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface RequestHandler {
    (req: Request, res: Response, next: NextFunction): any;
  }
}
