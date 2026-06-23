import { Request, Response } from 'express';
import * as progressService from '../services/readingProgressService';
import { success, badRequest, serverError } from '../utils/response';

// 获取阅读进度
export const getReadingProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const novelId = parseInt(req.params.novelId);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const progress = await progressService.getProgress(userId, novelId);
    success(res, progress);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 更新阅读进度
export const updateReadingProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const novelId = parseInt(req.params.novelId);
    const { chapterId, scrollPosition } = req.body;

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    if (!chapterId || isNaN(Number(chapterId))) {
      badRequest(res, '章节ID不能为空');
      return;
    }

    if (scrollPosition === undefined || scrollPosition === null) {
      badRequest(res, '滚动位置不能为空');
      return;
    }

    const parsedPosition = parseFloat(scrollPosition);
    if (isNaN(parsedPosition) || parsedPosition < 0 || parsedPosition > 1) {
      badRequest(res, '滚动位置必须在0-1之间');
      return;
    }

    await progressService.updateProgress(
      userId,
      novelId,
      Number(chapterId),
      parsedPosition
    );
    success(res, null, '更新成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};
