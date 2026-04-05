import { Query } from 'express-serve-static-core';

declare module 'express-serve-static-core' {
  export interface RequestHandler<
      P = ParamsDictionary,
      ResBody = any,
      ReqBody = any,
      ReqQuery = Query,
      LocalsObj extends Record<string, any> = Record<string, any>
  > {
      (req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>, res: Response<ResBody, LocalsObj>, next: NextFunction): any;
  }
}
