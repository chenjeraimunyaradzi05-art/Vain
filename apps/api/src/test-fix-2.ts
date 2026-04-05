import { Request, Response, NextFunction, RequestHandler } from 'express';

const handler: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return void res.json({ ok: true });
};
