import { Router } from 'express';
import * as novelController from '../controllers/novelController';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth';

const router = Router();

// 公开接口（无需登录，但带 token 可识别登录态用于权限判断）
// 获取公开小说列表（首页）
router.get('/novels', novelController.getNovelList);

// 获取小说详情（公开小说任何人可看；私有小说需作者或书架收藏者）
router.get('/novels/:id', optionalAuthMiddleware, novelController.getNovelDetail);

// 获取章节目录（权限同详情）
router.get('/novels/:id/chapters', optionalAuthMiddleware, novelController.getChapterList);

// 获取章节内容（权限同详情）
router.get('/novels/:novelId/chapters/:chapterId', optionalAuthMiddleware, novelController.getChapterDetail);

// 以下接口需要登录
router.use(authMiddleware);

// 我的作品（当前用户上传的小说）
router.get('/users/me/novels', novelController.getMyNovels);

// 我的书架（当前用户收藏的小说）
router.get('/users/me/bookshelf', novelController.getMyBookshelf);

// 修改小说公开状态（仅作者）
router.patch('/novels/:id/visibility', novelController.updateNovelVisibility);

// 创建小说（手动，归属当前用户）
router.post('/novels', novelController.createNovel);

// 创建章节（手动，含归属校验）
router.post('/novels/:id/chapters', novelController.createChapter);

// 上传小说（从 crawler-novels）
router.post('/admin/novels/upload', novelController.uploadNovelFromCrawler);

export default router;
