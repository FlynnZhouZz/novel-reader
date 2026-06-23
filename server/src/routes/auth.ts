import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { avatarUpload } from '../middlewares/upload';

const router = Router();

// 发送验证码
router.post('/auth/send-code', authController.sendVerificationCode);

// 邮箱+验证码注册
router.post('/auth/register', authController.registerWithCode);

// 邮箱+密码注册
router.post('/auth/register-with-password', authController.registerWithPassword);

// 邮箱+验证码登录
router.post('/auth/login-with-code', authController.loginWithCode);

// 邮箱+密码登录
router.post('/auth/login', authController.loginWithPassword);

// 重置密码
router.post('/auth/reset-password', authController.resetPassword);

// 以下 /user 路径接口需要登录
router.use('/user', authMiddleware);

// 获取当前用户信息
router.get('/user/profile', authController.getProfile);

// 更新用户信息
router.put('/user/profile', authController.updateProfile);

// 上传头像
router.post('/user/avatar', avatarUpload, authController.uploadAvatar);

// 修改密码
router.put('/user/password', authController.changePassword);

export default router;
