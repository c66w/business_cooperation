import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  // 尝试直接连接，如果代理失败的话
  const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '/api';

  console.log('AuthContext initialized with API_BASE:', API_BASE);

  // 初始化时检查本地存储的token
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    console.log('AuthContext初始化 - 检查本地存储:', {
      hasToken: !!savedToken,
      hasUser: !!savedUser,
      tokenPreview: savedToken ? savedToken.substring(0, 20) + '...' : null
    });

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);

        // 如果是商家用户，自动加载文档列表
        if (userData.role === 'merchant') {
          // 延迟加载，确保token已设置
          setTimeout(() => {
            fetchDocuments();
          }, 100);
        }

        console.log('✅ 恢复认证状态成功');
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('❌ 没有找到保存的认证信息');
    }
    setLoading(false);
  }, []);

  // 登录函数
  const login = async (username, password) => {
    try {
      console.log('Attempting login with:', { username, API_BASE });

      // 先测试网络连接
      console.log('Testing network connection...');

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response data:', data);

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success(`登录成功！欢迎 ${data.user.name}`);
        return { success: true, user: data.user };
      } else {
        message.error(data.message || '登录失败');
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error(`网络错误：${error.message}`);
      return { success: false, message: error.message };
    }
  };

  // 登出函数
  const logout = () => {
    setToken(null);
    setUser(null);
    setDocuments([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('已退出登录');
  };

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      const response = await apiRequest('/document/list');
      if (response && response.success) {
        setDocuments(response.data || []);
        return response.data || [];
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
    }
    return [];
  };

  // 添加文档到列表
  const addDocuments = (newDocuments) => {
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  // 删除文档
  const removeDocument = async (documentId) => {
    try {
      const response = await apiRequest(`/document/delete/${documentId}`, {
        method: 'DELETE'
      });

      if (response && response.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        return true;
      }
    } catch (error) {
      console.error('删除文档失败:', error);
    }
    return false;
  };

  // API请求封装
  const apiRequest = async (url, options = {}) => {
    try {
      // 构建headers，如果是FormData则不设置Content-Type
      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      };

      // 如果不是FormData，则设置Content-Type为application/json
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        message.error('登录已过期，请重新登录');
        logout();
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      message.error('网络请求失败');
      return null;
    }
  };

  // 检查权限
  const hasPermission = (requiredRole) => {
    if (!user) return false;

    console.log('权限检查:', { userRole: user.role, requiredRole });

    // 简化权限检查 - 精确匹配或管理员权限
    if (user.role === 'admin') return true; // 管理员有所有权限
    if (user.role === requiredRole) return true; // 精确匹配

    // 层级权限检查
    const roleHierarchy = {
      'admin': 3,
      'reviewer': 2,
      'merchant': 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    console.log('权限级别:', { userLevel, requiredLevel, hasPermission: userLevel >= requiredLevel });

    return userLevel >= requiredLevel;
  };

  // 获取角色中文名称
  const getRoleName = (role) => {
    const roleNames = {
      'admin': '管理员',
      'reviewer': '审核员',
      'merchant': '商家'
    };
    return roleNames[role] || role;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    apiRequest,
    hasPermission,
    getRoleName,
    isAuthenticated: !!token && !!user,
    // 文档管理
    documents,
    fetchDocuments,
    addDocuments,
    removeDocument
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
