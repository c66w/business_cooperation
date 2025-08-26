/**
 * 商家仪表板 - 商家登录后的首页
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Button,
  Space,
  Typography,
  Divider,
  Empty,
  message
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;



const MerchantDashboard = () => {
  const { user, apiRequest, documents, fetchDocuments, removeDocument } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取申请列表
  const fetchApplications = async () => {
    console.log('🔍 开始获取申请列表...');
    try {
      console.log('🔍 发送请求到: /merchant/my-applications');
      const response = await apiRequest('/merchant/my-applications');
      console.log('🔍 申请列表响应:', response);
      if (response && response.success) {
        console.log('🔍 设置申请数据:', response.data?.length, '条记录');
        setApplications(response.data || []);
      }
    } catch (error) {
      console.error('❌ 获取申请列表失败:', error);
    }
  };







  // 删除文档
  const handleDeleteDocument = async (documentId) => {
    const success = await removeDocument(documentId);
    if (success) {
      message.success('文档删除成功');
    } else {
      message.error('文档删除失败');
    }
  };

  useEffect(() => {
    console.log('🔍 MerchantDashboard useEffect - 用户信息:', user);

    const loadData = async () => {
      console.log('🔍 开始加载数据...');
      setLoading(true);

      try {
        console.log('🔍 调用 fetchApplications...');
        await fetchApplications();
        console.log('🔍 fetchApplications 完成');

        console.log('🔍 调用 fetchDocuments...');
        await fetchDocuments();
        console.log('🔍 fetchDocuments 完成');
      } catch (error) {
        console.error('❌ 加载数据失败:', error);
      }

      setLoading(false);
      console.log('🔍 数据加载完成');
    };

    loadData();
  }, [user]);

  // 获取申请状态统计
  const getApplicationStats = () => {
    const stats = {
      total: applications.length,
      pending: applications.filter(app =>
        app.status === 'pending' ||
        app.status === 'submitted' ||
        app.status === 'under_review'
      ).length,
      approved: applications.filter(app => app.status === 'approved').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };
    return stats;
  };

  const stats = getApplicationStats();

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'orange', text: '待审核', icon: <ClockCircleOutlined /> },
      'submitted': { color: 'blue', text: '已提交', icon: <FileTextOutlined /> },
      'under_review': { color: 'processing', text: '审核中', icon: <ClockCircleOutlined /> },
      'approved': { color: 'green', text: '已通过', icon: <CheckCircleOutlined /> },
      'rejected': { color: 'red', text: '已拒绝', icon: <ExclamationCircleOutlined /> },
      'draft': { color: 'default', text: '草稿', icon: <FileTextOutlined /> }
    };
    
    const config = statusMap[status] || { color: 'default', text: status, icon: <FileTextOutlined /> };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  return (
    <div className="page-container" style={{ margin: '24px' }}>
      {/* 欢迎信息 */}
      <div className="modern-card" style={{
        marginBottom: 32,
        padding: '40px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))'
      }}>
        <Title level={2} style={{
          marginBottom: 16,
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700
        }}>
          欢迎回来，{user?.name || '商家用户'}！
        </Title>
        <Text style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          这里是您的商家合作申请管理中心，您可以查看申请状态、上传文档和提交新申请。
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <div className="stats-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(102, 126, 234, 0.1))'
          }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>总申请数</span>}
              value={stats.total}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: '28px' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stats-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1), rgba(102, 126, 234, 0.1))'
          }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>待审核</span>}
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 700, fontSize: '28px' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stats-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(102, 126, 234, 0.1))'
          }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>已通过</span>}
              value={stats.approved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: '28px' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stats-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(245, 34, 45, 0.1), rgba(102, 126, 234, 0.1))'
          }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>已拒绝</span>}
              value={stats.rejected}
              prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 700, fontSize: '28px' }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[32, 24]}>
        {/* 最近申请 */}
        <Col xs={24} lg={14}>
          <div className="modern-card" style={{ padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '6px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '3px',
                  marginRight: '12px'
                }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2c3e50'
                }}>
                  我的申请
                </h3>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/apply')}
                className="gradient-button"
                style={{
                  height: '40px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  fontWeight: 500
                }}
              >
                新建申请
              </Button>
            </div>
            {applications.length > 0 ? (
              <List
                dataSource={applications.slice(0, 5)}
                renderItem={app => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        icon={<EyeOutlined />}
                        onClick={() => {
                          // 跳转到申请详情页面
                          navigate(`/application/${app.id}`);
                        }}
                      >
                        查看
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{app.company_name || '未命名申请'}</span>
                          {getStatusTag(app.status)}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">
                            申请时间: {new Date(app.created_at).toLocaleDateString()}
                          </Text>
                          {app.product_category && (
                            <Text type="secondary">
                              产品类别: {app.product_category}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无申请记录"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/apply')}
                >
                  立即申请
                </Button>
              </Empty>
            )}
          </div>
        </Col>

        {/* 文档管理 */}
        <Col xs={24} lg={10}>
          <div className="modern-card" style={{ padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '6px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '3px',
                  marginRight: '12px'
                }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2c3e50'
                }}>
                  文档管理
                </h3>
              </div>
              <Button
                type="primary"
                size="small"
                onClick={() => navigate('/apply')}
              >
                上传文档
              </Button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {documents.length > 0 ? (
                <List
                  dataSource={documents}
                  renderItem={doc => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          onClick={() => window.open(doc.oss_url, '_blank')}
                        >
                          查看
                        </Button>,
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          删除
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />}
                        title={doc.original_name || doc.file_name}
                        description={
                          <Space direction="vertical" size={4}>
                            <Text type="secondary">
                              {(doc.file_size / 1024).toFixed(1)} KB
                            </Text>
                            <Text type="secondary">
                              {new Date(doc.upload_time).toLocaleDateString()}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="暂无文档"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button
                    type="primary"
                    onClick={() => navigate('/apply')}
                  >
                    上传文档
                  </Button>
                </Empty>
              )}
            </div>
          </div>
        </Col>
      </Row>


    </div>
  );
};

export default MerchantDashboard;
