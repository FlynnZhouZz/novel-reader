// 用户相关类型
export interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
}

export interface LoginResult {
  token: string;
  user: UserInfo;
}

// 小说相关类型
export interface Novel {
  id: number;
  name: string;
  cover: string | null;
  description: string | null;
  author: string;
  chapterCount: number;
  isPublic?: boolean;
  isOwner?: boolean;
  createdAt: string;
}

export interface NovelListResponse {
  list: Novel[];
  total: number;
  page: number;
  limit: number;
}

export interface ChapterListItem {
  id: number;
  title: string;
  orderNum: number;
}

export interface ChapterDetail {
  id: number;
  title: string;
  content: string;
  orderNum: number;
  prevChapterId: number | null;
  nextChapterId: number | null;
}

export interface ReadingProgress {
  chapterId: number;
  scrollPosition: number;
}

// 阅读器设置
export type FlipMode = 'scroll' | 'slide' | 'cover' | 'realistic';

export interface ReaderSettings {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  darkMode: boolean;
  flipMode: FlipMode;
  autoReadSpeed: number;
}

// API 响应
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}
