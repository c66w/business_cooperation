import React from 'react';
import { Result, Button } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole, fallback }) => {
  const { user, hasPermission, getRoleName } = useAuth();

  if (!user) {
    return fallback || (
      <Result
        status="403"
        title="需要登录"
        subTitle="请先登录后再访问此页面"
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        }
      />
    );
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <Result
        status="403"
        title="权限不足"
        subTitle={`此页面需要 ${getRoleName(requiredRole)} 权限，您当前是 ${getRoleName(user.role)}`}
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    );
  }

  return children;
};

export default ProtectedRoute;
