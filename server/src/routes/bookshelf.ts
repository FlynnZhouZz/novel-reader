import { Router } from 'express';
import * as bookshelfController from '../controllers/bookshelfController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// 书架接口需要登录
router.use(authMiddleware);

// 加入书架
router.post('/bookshelf/:novelId', bookshelfController.addToBookshelf);

// 移出书架
router.delete('/bookshelf/:novelId', bookshelfController.removeFromBookshelf);

// 检查是否在书架
router.get('/bookshelf/:novelId', bookshelfController.checkBookshelf);

export default router;
