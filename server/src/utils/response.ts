import { Response } from 'express';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

export const success = <T>(res: Response, data?: T, message: string = 'success'): Response => {
  return res.json({
    code: 200,
    message,
    data,
  });
};

export const error = (res: Response, code: number, message: string): Response => {
  return res.status(code >= 100 && code < 600 ? code : 500).json({
    code,
    message,
  });
};

export const badRequest = (res: Response, message: string = '请求参数错误'): Response => {
  return error(res, 400, message);
};

export const unauthorized = (res: Response, message: string = '未登录或Token失效'): Response => {
  return error(res, 401, message);
};

export const forbidden = (res: Response, message: string = '无权限'): Response => {
  return error(res, 403, message);
};

export const notFound = (res: Response, message: string = '资源不存在'): Response => {
  return error(res, 404, message);
};

export const serverError = (res: Response, message: string = '服务器内部错误'): Response => {
  return error(res, 500, message);
};
