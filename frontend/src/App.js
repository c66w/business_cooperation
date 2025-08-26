import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Space, Spin } from 'antd';
import {
  HomeOutlined,
  FormOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import MerchantApplicationPage from './components/MerchantApplicationPage';
import MerchantDashboard from './components/MerchantDashboard';
import ReviewManagementPage from './components/ReviewManagementPage';
import ApplicationDetailPage from './components/ApplicationDetailPage';
import './App.css';

const { Header, Content } = Layout;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getRoleName, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 根据用户角色显示不同的菜单项
  const getMenuItems = () => {
    const items = [];

    // 商家可以看到的页面
    if (user.role === 'merchant') {
      items.push(
        {
          key: '/',
          icon: <HomeOutlined />,
          label: '我的首页'
        },
        {
          key: '/apply',
          icon: <FormOutlined />,
          label: '提交申请'
        }
      );
    }

    // 审核员可以看到的页面
    if (user.role === 'reviewer') {
      items.push(
        {
          key: '/',
          icon: <HomeOutlined />,
          label: '我的任务'
        },
        {
          key: '/review',
          icon: <AuditOutlined />,
          label: '审核管理'
        }
      );
    }

    // 管理员只能看到审核管理页面
    if (user.role === 'admin') {
      items.push(
        {
          key: '/',
          icon: <AuditOutlined />,
          label: '审核管理'
        }
      );
    }

    return items;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        borderRadius: '0 0 20px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '24px',
            fontWeight: 700,
            marginRight: '50px'
          }}>
            商家合作管理系统
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              minWidth: 0,
              background: 'transparent',
              border: 'none'
            }}
          />
        </div>

        <Dropdown
          menu={{
            items: userMenuItems,
            onClick: ({ key }) => {
              if (key === 'logout') {
                logout();
              }
            }
          }}
          placement="bottomRight"
        >
          <Space style={{
            cursor: 'pointer',
            color: '#2c3e50',
            padding: '8px 16px',
            borderRadius: '12px',
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <Avatar
              icon={<UserOutlined />}
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                border: 'none'
              }}
            />
            <span style={{ fontWeight: 500 }}>{user.name}</span>
            <span style={{
              background: user.role === 'admin' ? 'linear-gradient(45deg, #f5222d, #ff7875)' :
                         user.role === 'reviewer' ? 'linear-gradient(45deg, #1890ff, #40a9ff)' :
                         'linear-gradient(45deg, #52c41a, #73d13d)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              {getRoleName(user.role)}
            </span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ background: 'transparent' }}>
        <Routes>
          <Route
            path="/"
            element={
              user.role === 'merchant' ? (
                <MerchantDashboard />
              ) : user.role === 'reviewer' ? (
                <ProtectedRoute requiredRole="reviewer">
                  <ReviewPage />
                </ProtectedRoute>
              ) : (
                <ProtectedRoute requiredRole="admin">
                  <ReviewManagementPage />
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              user.role === 'admin' ? (
                <ProtectedRoute requiredRole="admin">
                  <ReviewManagementPage />
                </ProtectedRoute>
              ) : (
                <ProtectedRoute requiredRole="reviewer">
                  <ReviewManagementPage />
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="/application/:applicationId"
            element={
              <ProtectedRoute requiredRole="merchant">
                <ApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
