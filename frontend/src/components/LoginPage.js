import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Divider, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (username, password) => {
    form.setFieldsValue({ username, password });
  };

  const demoAccounts = [
    {
      username: 'admin',
      password: 'admin123',
      name: '系统管理员',
      role: 'admin',
      color: 'red'
    },
    {
      username: 'reviewer1',
      password: 'reviewer123',
      name: '张审核',
      role: 'reviewer',
      color: 'blue'
    },
    {
      username: 'reviewer2',
      password: 'reviewer123',
      name: '李审核',
      role: 'reviewer',
      color: 'blue'
    },
    {
      username: 'merchant1',
      password: 'merchant123',
      name: '测试商家',
      role: 'merchant',
      color: 'green'
    }
  ];

  const getRoleText = (role) => {
    const roleMap = {
      'admin': '管理员',
      'reviewer': '审核员',
      'merchant': '商家'
    };
    return roleMap[role] || role;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            商家合作系统
          </Title>
          <Text type="secondary">请选择角色登录系统</Text>
        </div>

        <Form
          form={form}
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>演示账户</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '12px', color: '#666' }}>
            点击下方账户快速填入登录信息
          </Text>
          
          {demoAccounts.map((account) => (
            <Card
              key={account.username}
              size="small"
              hoverable
              onClick={() => fillDemoCredentials(account.username, account.password)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color={account.color}>{getRoleText(account.role)}</Tag>
                    <Text strong>{account.name}</Text>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {account.username} / {account.password}
                </Text>
              </div>
            </Card>
          ))}
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
