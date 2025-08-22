import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// API方法
export const reviewAPI = {
  // 获取商家合作列表
  getReviewList: () => api.get('/api/review/list'),

  // 获取详细信息
  getReviewDetail: (userId) => api.get(`/api/review/detail/${userId}`),
};

export default api;
