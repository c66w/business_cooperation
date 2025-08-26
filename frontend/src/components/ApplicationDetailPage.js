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

// 字段名称映射函数
const getFieldDisplayName = (fieldName) => {
  const fieldMap = {
    'company_name': '公司名称',
    'contact_name': '联系人姓名',
    'contact_phone': '联系电话',
    'contact_email': '联系邮箱',
    'product_category': '产品品类',
    'specific_products': '具体产品',
    'business_address': '营业地址',
    'registration_capital': '注册资本',
    'establishment_date': '成立时间',
    'business_scope': '经营范围',
    'company_description': '公司简介',
    'annual_production_capacity': '年生产规模',
    'own_brand': '自有品牌',
    'brand_name': '品牌名称',
    'cooperation_requirements': '合作需求',
    'merchant_type': '商家类型',
    'own_brand_operation_ability': '自有品牌运营能力',
    'oem_famous_brands': '代工的知名品牌',
    'accept_brand_cocreation': '接受品牌共创',
    'accept_deep_cooperation': '接受深度合作',
    'accept_online_exclusive': '接受线上独家',
    'brand_awareness': '品牌知名度',
    'sales_data': '销售数据',
    'cooperation_budget': '合作预算',
    'dealer_brand_names': '经销的品牌名称',
    'industry_operator_contact': '对接行业运营花名'
  };

  return fieldMap[fieldName] || fieldName;
};

// 安全地获取字段值
const getFieldValue = (value) => {
  if (value === null || value === undefined) {
    return '未填写';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

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
                label={getFieldDisplayName(field.field_name)}
              >
                {getFieldValue(field.field_value)}
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
