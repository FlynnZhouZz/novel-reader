import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加Token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一处理错误
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // Token失效，清除登录信息并跳转登录页
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          window.location.href = '/login';
        }
      }
      return Promise.reject({
        code: data?.code || status,
        message: data?.message || '请求失败',
      });
    }
    return Promise.reject({
      code: 500,
      message: error.message || '网络错误',
    });
  }
);

export default apiClient;
