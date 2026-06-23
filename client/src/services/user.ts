import apiClient from './api';
import { LoginResult, UserInfo, ApiResponse } from '../types';

// 发送验证码
export const sendCode = (email: string, type: 'register' | 'login' | 'reset') => {
  return apiClient.post('/auth/send-code', { email, type });
};

// 邮箱+验证码注册
export const registerWithCode = (email: string, code: string, password: string, confirmPassword: string) => {
  return apiClient.post('/auth/register', { email, code, password, confirmPassword });
};

// 邮箱+密码注册
export const registerWithPassword = (email: string, password: string, confirmPassword: string) => {
  return apiClient.post('/auth/register-with-password', { email, password, confirmPassword });
};

// 邮箱+验证码登录
export const loginWithCode = (email: string, code: string) => {
  return apiClient.post('/auth/login-with-code', { email, code });
};

// 邮箱+密码登录
export const login = (email: string, password: string) => {
  return apiClient.post('/auth/login', { email, password });
};

// 重置密码
export const resetPassword = (email: string, code: string, newPassword: string, confirmPassword: string) => {
  return apiClient.post('/auth/reset-password', { email, code, newPassword, confirmPassword });
};

// 获取用户信息
export const getProfile = (): Promise<ApiResponse<UserInfo>> => {
  return apiClient.get('/user/profile');
};

// 更新用户信息
export const updateProfile = (nickname: string, bio: string) => {
  return apiClient.put('/user/profile', { nickname, bio });
};

// 上传头像
export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiClient.post('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 修改密码
export const changePassword = (oldPassword: string, newPassword: string, confirmPassword: string) => {
  return apiClient.put('/user/password', { oldPassword, newPassword, confirmPassword });
};
