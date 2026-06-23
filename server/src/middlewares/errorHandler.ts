import { Request, Response, NextFunction } from 'express';
import { serverError } from '../utils/response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('错误:', err.message);
  serverError(res, err.message || '服务器内部错误');
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    code: 404,
    message: `接口不存在: ${req.method} ${req.path}`,
  });
};
