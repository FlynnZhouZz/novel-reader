import apiClient from './api';
import { NovelListResponse, Novel, ChapterListItem, ChapterDetail } from '../types';

// 获取小说列表
export const getNovelList = (page: number = 1, limit: number = 20, keyword?: string, author?: string) => {
  const params: any = { page, limit };
  if (keyword) params.keyword = keyword;
  if (author) params.author = author;
  return apiClient.get('/novels', { params });
};

// 获取小说详情
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

// 创建小说
export const createNovel = (name: string, author: string, cover?: string, description?: string) => {
  return apiClient.post('/novels', { name, author, cover, description });
};

// 创建章节
export const createChapter = (novelId: number, title: string, content: string, orderNum?: number) => {
  return apiClient.post(`/novels/${novelId}/chapters`, { title, content, orderNum });
};
