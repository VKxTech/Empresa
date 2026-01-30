import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if ((req.session as any).adminId) {
        return next();
    }
    res.redirect('/admin/login');
};
