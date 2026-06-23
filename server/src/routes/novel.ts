import { Router } from 'express';
import * as novelController from '../controllers/novelController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// 公开接口（无需登录）
// 获取小说列表
router.get('/novels', novelController.getNovelList);

// 获取小说详情
router.get('/novels/:id', novelController.getNovelDetail);

// 获取章节目录
router.get('/novels/:id/chapters', novelController.getChapterList);

// 获取章节内容
router.get('/novels/:novelId/chapters/:chapterId', novelController.getChapterDetail);

// 以下接口需要登录
router.use(authMiddleware);

// 创建小说（手动）
router.post('/novels', novelController.createNovel);

// 创建章节（手动）
router.post('/novels/:id/chapters', novelController.createChapter);

// 上传小说（从 crawler-novels）
router.post('/admin/novels/upload', novelController.uploadNovelFromCrawler);

export default router;
