import { Request, Response } from 'express';
import * as novelService from '../services/novelService';
import { success, badRequest, serverError } from '../utils/response';

// 获取小说列表
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

// 获取小说详情
export const getNovelDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id) || id < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const novel = await novelService.getNovelDetail(id);
    success(res, novel);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取章节目录
export const getChapterList = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.id);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    const chapters = await novelService.getChapterList(novelId);
    success(res, chapters);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取章节内容
export const getChapterDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.novelId);
    const chapterId = parseInt(req.params.chapterId);

    if (isNaN(novelId) || novelId < 1) {
      badRequest(res, '小说ID无效');
      return;
    }

    if (isNaN(chapterId) || chapterId < 1) {
      badRequest(res, '章节ID无效');
      return;
    }

    const chapter = await novelService.getChapterDetail(novelId, chapterId);
    success(res, chapter);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 上传小说（从 crawler-novels）
export const uploadNovelFromCrawler = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      crawlerNovelPath,
      novelDir,
      author,
      contentBaseDir,
      cover,
      description,
      overwrite,
    } = req.body;

    // 兼容旧字段 crawlerNovelPath，优先使用 novelDir
    const finalNovelDir = novelDir || crawlerNovelPath;
    if (!finalNovelDir) {
      badRequest(res, '请提供小说目录路径（novelDir 或 crawlerNovelPath）');
      return;
    }

    const result = await novelService.uploadNovelFromCrawler({
      novelDir: finalNovelDir,
      author,
      contentBaseDir,
      cover,
      description,
      overwrite,
    });
    success(res, result, '上传成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 创建小说（手动）
export const createNovel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, author, cover, description } = req.body;

    if (!name || name.length > 100) {
      badRequest(res, '小说名称无效（最多100字符）');
      return;
    }

    if (!author || author.length > 50) {
      badRequest(res, '作者无效（最多50字符）');
      return;
    }

    const result = await novelService.createNovel(name, author, cover, description);
    success(res, result, '创建成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 创建章节（手动）
export const createChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const novelId = parseInt(req.params.id);
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

    const result = await novelService.createChapter(novelId, title, content, orderNum);
    success(res, result, '创建成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};
