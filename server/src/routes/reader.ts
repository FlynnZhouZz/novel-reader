import { Router } from 'express';
import * as progressController from '../controllers/readingProgressController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// 阅读进度接口需要登录
router.use(authMiddleware);

// 获取阅读进度
router.get('/reading-progress/:novelId', progressController.getReadingProgress);

// 更新阅读进度
router.put('/reading-progress/:novelId', progressController.updateReadingProgress);

export default router;
