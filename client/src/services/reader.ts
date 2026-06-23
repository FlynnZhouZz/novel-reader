import apiClient from './api';
import { ReadingProgress } from '../types';

// 获取阅读进度
export const getReadingProgress = (novelId: number) => {
  return apiClient.get(`/reading-progress/${novelId}`);
};

// 更新阅读进度
export const updateReadingProgress = (novelId: number, chapterId: number, scrollPosition: number) => {
  return apiClient.put(`/reading-progress/${novelId}`, { chapterId, scrollPosition });
};
