import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express';

const handler = async (req: Request, res: Response, next: NextFunction) => {
    return void res.json({ ok: true });
};

const h: RequestHandler = handler;
