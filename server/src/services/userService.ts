import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

export interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

export interface LoginResult {
  token: string;
  user: UserInfo;
}

const toUserInfo = (user: User): UserInfo => {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.created_at,
  };
};

// 根据邮箱查找用户
export const findByEmail = async (email: string): Promise<User | null> => {
  return User.findOne({ where: { email } });
};

// 根据ID查找用户
export const findById = async (id: number): Promise<User | null> => {
  return User.findByPk(id);
};

// 创建用户
export const createUser = async (
  email: string,
  password: string
): Promise<LoginResult> => {
  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    email,
    password: hashedPassword,
    nickname: '新用户',
  });

  const token = generateToken(user.id);
  return {
    token,
    user: toUserInfo(user),
  };
};

// 密码登录
export const loginWithPassword = async (
  email: string,
  password: string
): Promise<LoginResult> => {
  const user = await findByEmail(email);
  if (!user) {
    throw new Error('该邮箱尚未注册');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new Error('邮箱或密码错误');
  }

  const token = generateToken(user.id);
  return {
    token,
    user: toUserInfo(user),
  };
};

// 验证码登录
export const loginWithCode = async (email: string): Promise<LoginResult> => {
  const user = await findByEmail(email);
  if (!user) {
    throw new Error('该邮箱尚未注册');
  }

  const token = generateToken(user.id);
  return {
    token,
    user: toUserInfo(user),
  };
};

// 重置密码
export const resetPassword = async (
  email: string,
  newPassword: string
): Promise<string> => {
  const user = await findByEmail(email);
  if (!user) {
    throw new Error('该邮箱尚未注册');
  }

  const hashedPassword = await hashPassword(newPassword);
  await user.update({ password: hashedPassword });

  const token = generateToken(user.id);
  return token;
};

// 更新用户信息
export const updateProfile = async (
  userId: number,
  nickname?: string,
  bio?: string
): Promise<UserInfo> => {
  const user = await findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const updateData: any = {};
  if (nickname !== undefined) updateData.nickname = nickname;
  if (bio !== undefined) updateData.bio = bio;

  await user.update(updateData);
  return toUserInfo(user);
};

// 更新头像
export const updateAvatar = async (
  userId: number,
  avatarUrl: string
): Promise<string> => {
  const user = await findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await user.update({ avatar: avatarUrl });
  return avatarUrl;
};

// 修改密码
export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) {
    throw new Error('原密码错误');
  }

  const hashedPassword = await hashPassword(newPassword);
  await user.update({ password: hashedPassword });
};

// 获取用户信息
export const getUserInfo = async (userId: number): Promise<UserInfo> => {
  const user = await findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  return toUserInfo(user);
};
