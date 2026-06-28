import apiClient from './api';
import { NovelListResponse, Novel, ChapterListItem, ChapterDetail } from '../types';

// 获取公开小说列表（首页，无需登录）
export const getNovelList = (page: number = 1, limit: number = 20, keyword?: string, author?: string) => {
  const params: any = { page, limit };
  if (keyword) params.keyword = keyword;
  if (author) params.author = author;
  return apiClient.get('/novels', { params });
};

// 获取小说详情（公开小说任何人可看；私有小说需作者或书架收藏者）
export const getNovelDetail = (id: number) => {
  return apiClient.get(`/novels/${id}`);
};

// 获取章节目录
export const getChapterList = (novelId: number) => {
  return apiClient.get(`/novels/${novelId}/chapters`);
};

// 获取章节内容
export const getChapterDetail = (novelId: number, chapterId: number) => {
  return apiClient.get(`/novels/${novelId}/chapters/${chapterId}`);
};

// 我的作品（当前用户上传的小说）
export const getMyNovels = (page: number = 1, limit: number = 20) => {
  return apiClient.get('/users/me/novels', { params: { page, limit } });
};

// 我的书架（当前用户收藏的小说）
export const getMyBookshelf = (page: number = 1, limit: number = 20) => {
  return apiClient.get('/users/me/bookshelf', { params: { page, limit } });
};

// 修改小说公开状态（仅作者）
export const updateNovelVisibility = (novelId: number, isPublic: boolean) => {
  return apiClient.patch(`/novels/${novelId}/visibility`, { isPublic });
};

// 加入书架
export const addToBookshelf = (novelId: number) => {
  return apiClient.post(`/bookshelf/${novelId}`);
};

// 移出书架
export const removeFromBookshelf = (novelId: number) => {
  return apiClient.delete(`/bookshelf/${novelId}`);
};

// 检查是否在书架
export const checkBookshelf = (novelId: number) => {
  return apiClient.get(`/bookshelf/${novelId}`);
};

// 创建小说
export const createNovel = (name: string, author: string, cover?: string, description?: string, isPublic?: boolean) => {
  return apiClient.post('/novels', { name, author, cover, description, isPublic });
};

// 创建章节
export const createChapter = (novelId: number, title: string, content: string, orderNum?: number) => {
  return apiClient.post(`/novels/${novelId}/chapters`, { title, content, orderNum });
};
