import { Request, Response } from 'express';
import * as novelService from '../services/novelService';
import { success, badRequest, serverError } from '../utils/response';

// 获取公开小说列表（首页，无需登录）
export const getNovelList = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedPage = parseInt(req.query.page as string);
    const parsedLimit = parseInt(req.query.limit as string);
    const page = isNaN(parsedPage) ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) ? 20 : parsedLimit;
    const keyword = req.query.keyword as string | undefined;
    const author = req.query.author as string | undefined;

    if (page < 1 || limit < 1 || limit > 100) {
      badRequest(res, '分页参数无效');
      return;
    }
    const result = await novelService.getNovelList(page, limit, keyword, author);
    success(res, result);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取小说详情（公开小说任何人可看；私有小说需作者或书架收藏者）
export const getNovelDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId as number | undefined;

    if (isNaN(id) || id < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const novel = await novelService.getNovelDetail(id, userId);
    success(res, novel);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取章节目录（权限同详情）
export const getChapterList = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.id);
    const userId = (req as any).userId as number | undefined;

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const chapters = await novelService.getChapterList(novelId, userId);
    success(res, chapters);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取章节内容（权限同详情）
export const getChapterDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.novelId);
    const chapterId = parseInt(req.params.chapterId);
    const userId = (req as any).userId as number | undefined;

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    if (isNaN(chapterId) || chapterId < 1) {
      badRequest(res, '章节ID无效');
      return;
    }

    const chapter = await novelService.getChapterDetail(novelId, chapterId, userId);
    success(res, chapter);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 上传小说（从 crawler-novels）
export const uploadNovelFromCrawler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const { novelDir, author, contentBaseDir, cover, description, overwrite, isPublic } = req.body;

    if (!novelDir) {
      badRequest(res, '请提供小说目录路径 novelDir');
      return;
    }

    const result = await novelService.uploadNovelFromCrawler({
      novelDir,
      userId,
      author,
      contentBaseDir,
      cover,
      description,
      overwrite: !!overwrite,
      isPublic: !!isPublic,
    });
    success(res, result, '上传成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 创建小说（手动，归属当前用户）
export const createNovel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const { name, author, cover, description, isPublic } = req.body;

    if (!name || name.length > 100) {
      badRequest(res, '小说名称无效（最多100字符）');
      return;
    }

    if (!author || author.length > 50) {
      badRequest(res, '作者无效（最多50字符）');
      return;
    }

    const result = await novelService.createNovel(userId, name, author, cover, description, !!isPublic);
    success(res, result, '创建成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 创建章节（手动，含归属校验）
export const createChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.id);
    const userId = (req as any).userId as number;
    const { title, content, orderNum } = req.body;

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    if (!title || title.length > 200) {
      badRequest(res, '章节标题无效（最多200字符）');
      return;
    }

    if (!content) {
      badRequest(res, '章节内容不能为空');
      return;
    }

    const result = await novelService.createChapter(novelId, userId, title, content, orderNum);
    success(res, result, '创建成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 我的作品（当前用户上传的小说）
export const getMyNovels = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const parsedPage = parseInt(req.query.page as string);
    const parsedLimit = parseInt(req.query.limit as string);
    const page = isNaN(parsedPage) ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) ? 20 : parsedLimit;

    const result = await novelService.getMyNovels(userId, page, limit);
    success(res, result);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 我的书架（当前用户收藏的小说）
export const getMyBookshelf = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as number;
    const parsedPage = parseInt(req.query.page as string);
    const parsedLimit = parseInt(req.query.limit as string);
    const page = isNaN(parsedPage) ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) ? 20 : parsedLimit;

    const result = await novelService.getMyBookshelf(userId, page, limit);
    success(res, result);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 修改小说公开状态（仅作者）
export const updateNovelVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.id);
    const userId = (req as any).userId as number;
    const { isPublic } = req.body;

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }
    if (typeof isPublic !== 'boolean') {
      badRequest(res, 'isPublic 必须为布尔值');
      return;
    }

    await novelService.updateNovelVisibility(novelId, userId, isPublic);
    success(res, null, isPublic ? '已设为公开' : '已设为私有');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};
