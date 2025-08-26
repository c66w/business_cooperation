import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  List,
  Timeline,
  Divider,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ApplicationDetailPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  // 获取申请详情
  const fetchApplicationDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 获取申请详情，applicationId:', applicationId);

      const response = await apiRequest(`/merchant/application/${applicationId}`);
      console.log('📄 申请详情响应:', response);

      if (response && response.success) {
        setApplication(response.data);
        console.log('✅ 申请详情获取成功:', response.data);
      } else {
        console.error('❌ 申请详情获取失败:', response);
        message.error(response?.message || '获取申请详情失败');
      }
    } catch (error) {
      console.error('❌ 获取申请详情异常:', error);
      message.error('获取申请详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetail();
    }
  }, [applicationId]);

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
      <Tag color={config.color} icon={config.icon} style={{ fontSize: '14px', padding: '4px 12px' }}>
        {config.text}
      </Tag>
    );
  };

  // 格式化时间
  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">未找到申请信息</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            申请详情
          </Title>
          {getStatusTag(application.status)}
        </Space>
      </div>

      {/* 基础信息 */}
      <Card
        title="基础信息"
        style={{ marginBottom: '24px' }}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="公司名称" span={2}>
            {application.company_name}
          </Descriptions.Item>
          <Descriptions.Item label="联系人">
            {application.attendee_name}
          </Descriptions.Item>
          <Descriptions.Item label="联系方式">
            {application.contact_info}
          </Descriptions.Item>
          <Descriptions.Item label="职位">
            {application.attendee_job || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="商家类型">
            {application.merchant_type}
          </Descriptions.Item>
          <Descriptions.Item label="提交时间" span={2}>
            {formatTime(application.submitted_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 详细信息 */}
      <Card
        title="详细信息"
        style={{ marginBottom: '24px' }}
      >
        {application.dynamic_fields && application.dynamic_fields.length > 0 ? (
          <Descriptions column={1} bordered>
            {application.dynamic_fields.map((field, index) => (
              <Descriptions.Item
                key={index}
                label={field.field_name}
              >
                {Array.isArray(field.field_value)
                  ? field.field_value.join(', ')
                  : field.field_value
                }
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: '#999'
          }}>
            暂无详细信息
          </div>
        )}
      </Card>
    </div>
  );
};

export default ApplicationDetailPage;
