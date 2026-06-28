import { Request, Response } from 'express';
import * as bookshelfService from '../services/bookshelfService';
import { success, badRequest, serverError } from '../utils/response';

// 加入书架
export const addToBookshelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const novelId = parseInt(req.params.novelId);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    await bookshelfService.addToBookshelf(userId, novelId);
    success(res, null, '已加入书架');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 移出书架
export const removeFromBookshelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const novelId = parseInt(req.params.novelId);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    await bookshelfService.removeFromBookshelf(userId, novelId);
    success(res, null, '已移出书架');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 检查是否在书架
export const checkBookshelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const novelId = parseInt(req.params.novelId);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const inBookshelf = await bookshelfService.isInBookshelf(userId, novelId);
    success(res, { inBookshelf });
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};
