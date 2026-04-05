import 'express';

declare module 'express-serve-static-core' {
  interface RequestHandler<
    P = any,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
    LocalsObj extends Record<string, any> = Record<string, any>
  > {
    (
      req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
      res: Response<ResBody, LocalsObj>,
      next: NextFunction,
    ): any;
  }
}
