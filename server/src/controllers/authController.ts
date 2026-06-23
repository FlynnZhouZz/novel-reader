import { Request, Response } from 'express';
import { sendCode, verifyCode, canSendCode, CodeType } from '../services/codeService';
import * as userService from '../services/userService';
import { validateEmail, validatePassword } from '../utils/validator';
import { success, badRequest, serverError } from '../utils/response';

// 发送验证码
export const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    const validTypes: CodeType[] = ['register', 'login', 'reset'];
    if (!type || !validTypes.includes(type)) {
      badRequest(res, '验证码类型无效');
      return;
    }

    // 检查发送频率
    if (!canSendCode(email)) {
      badRequest(res, '验证码发送过于频繁，请60秒后再试');
      return;
    }

    await sendCode(email, type);
    success(res, null, '验证码已发送');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 邮箱+验证码注册
export const registerWithCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, password, confirmPassword } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    if (!code) {
      badRequest(res, '请输入验证码');
      return;
    }

    if (!password || !validatePassword(password)) {
      badRequest(res, '密码需为8-20位，且包含字母和数字');
      return;
    }

    if (password !== confirmPassword) {
      badRequest(res, '两次密码不一致');
      return;
    }

    // 检查邮箱是否已注册
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      badRequest(res, '该邮箱已被注册');
      return;
    }

    // 验证验证码
    if (!verifyCode(email, code)) {
      badRequest(res, '验证码错误或已过期');
      return;
    }

    const result = await userService.createUser(email, password);
    success(res, result, '注册成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 邮箱+密码注册
export const registerWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    if (!password || !validatePassword(password)) {
      badRequest(res, '密码需为8-20位，且包含字母和数字');
      return;
    }

    if (password !== confirmPassword) {
      badRequest(res, '两次密码不一致');
      return;
    }

    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      badRequest(res, '该邮箱已被注册');
      return;
    }

    const result = await userService.createUser(email, password);
    success(res, result, '注册成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 邮箱+验证码登录
export const loginWithCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    if (!code) {
      badRequest(res, '请输入验证码');
      return;
    }

    if (!verifyCode(email, code)) {
      badRequest(res, '验证码错误或已过期');
      return;
    }

    const result = await userService.loginWithCode(email);
    success(res, result, '登录成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 邮箱+密码登录
export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    if (!password) {
      badRequest(res, '请输入密码');
      return;
    }

    const result = await userService.loginWithPassword(email, password);
    success(res, result, '登录成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 重置密码
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !validateEmail(email)) {
      badRequest(res, '请输入合法的邮箱');
      return;
    }

    if (!code) {
      badRequest(res, '请输入验证码');
      return;
    }

    if (!newPassword || !validatePassword(newPassword)) {
      badRequest(res, '密码需为8-20位，且包含字母和数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      badRequest(res, '两次密码不一致');
      return;
    }

    if (!verifyCode(email, code)) {
      badRequest(res, '验证码错误或已过期');
      return;
    }

    const token = await userService.resetPassword(email, newPassword);
    success(res, { token }, '密码重置成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 获取当前用户信息
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userInfo = await userService.getUserInfo(userId);
    success(res, userInfo);
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 更新用户信息
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { nickname, bio } = req.body;

    if (nickname !== undefined && nickname !== null && (typeof nickname !== 'string' || nickname.length < 2 || nickname.length > 20)) {
      badRequest(res, '昵称需为2-20个字符');
      return;
    }

    if (bio !== undefined && bio !== null && (typeof bio !== 'string' || bio.length > 200)) {
      badRequest(res, '简介最多200个字符');
      return;
    }

    const userInfo = await userService.updateProfile(userId, nickname, bio);
    success(res, userInfo, '更新成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 上传头像
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      badRequest(res, '请上传头像文件');
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await userService.updateAvatar(userId, avatarUrl);
    success(res, { avatar: avatarUrl }, '头像上传成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};

// 修改密码
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword) {
      badRequest(res, '请输入原密码');
      return;
    }

    if (!newPassword || !validatePassword(newPassword)) {
      badRequest(res, '新密码需为8-20位，且包含字母和数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      badRequest(res, '两次密码不一致');
      return;
    }

    await userService.changePassword(userId, oldPassword, newPassword);
    success(res, null, '密码修改成功');
  } catch (error) {
    serverError(res, (error as Error).message);
  }
};
