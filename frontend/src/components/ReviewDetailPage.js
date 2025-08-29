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
  Layout,
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
import axios from 'axios';
import { getMerchantTypeDisplayName } from '../utils/merchantTypeUtils';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

// 字段名称映射函数
const getFieldDisplayName = (fieldName) => {
  const fieldMap = {
    // 基础信息字段
    'company_name': '公司名称',
    'contact_name': '联系人姓名',
    'contact_phone': '联系电话',
    'contact_email': '联系邮箱',
    'attendee_name': '联系人姓名',
    'contact_info': '联系方式',
    'attendee_job': '职位',
    'merchant_type': '商家类型',

    // 业务信息字段
    'product_category': '产品品类',
    'specific_products': '具体产品',
    'business_address': '营业地址',
    'address': '地址',
    'registration_capital': '注册资本',
    'establishment_date': '成立时间',
    'business_scope': '经营范围',
    'company_description': '公司简介',
    'company_introduction': '公司简介',
    'cooperation_requirements': '合作需求',
    'industry_operator_contact': '对接行业运营花名',

    // 证照信息
    'business_license': '营业执照号',
    'documents': '相关文档',

    // 工厂类型字段
    'own_brand': '自有品牌',
    'own_brand_operation_capability': '自有品牌运营能力',
    'own_brand_operation_ability': '自有品牌运营能力',
    'oem_brands': '代工的知名品牌',
    'oem_famous_brands': '代工的知名品牌',
    'annual_production_capacity': '年生产规模',
    'need_mold_modification': '是否需要开模或修改包装',
    'mold_modification_time': '预计开模或修改包装需要时间',
    'accept_deep_cooperation': '接受深度合作',
    'accept_brand_co_creation': '接受品牌共创',
    'accept_brand_cocreation': '接受品牌共创',
    'accept_exclusive_authorization': '接受独家授权',
    'accept_online_exclusive': '接受线上独家',
    'accept_other_channel_authorization': '接受其他渠道授权',
    'accept_channel_profit_sharing': '接受渠道利润分成',

    // 品牌商字段
    'brand_name': '品牌名称',
    'brand_awareness': '品牌知名度',
    'brand_positioning': '品牌定位',
    'target_market': '目标市场',

    // 代理商字段
    'agent_brand_names': '代理的品牌名称',
    'agent_regions': '代理区域',
    'agent_channels': '代理渠道',
    'agent_experience': '代理经验',

    // 经销商字段
    'dealer_brand_names': '经销的品牌名称',
    'dealer_regions': '经销区域',
    'dealer_channels': '经销渠道',
    'dealer_experience': '经销经验',

    // 代运营商字段
    'operated_brand_names': '代运营的品牌名称',
    'sales_data': '销售数据',
    'cooperation_budget': '合作预算',
    'operation_experience': '运营经验'
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



const ReviewDetailPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  // 获取申请详情
  const fetchApplicationDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 获取审核详情，申请ID:', applicationId);

      const response = await axios.get(`/api/review/detail/${applicationId}`);
      console.log('📄 审核详情响应:', response);

      if (response.data.success) {
        const detailData = response.data.data;
        // 合并基础信息和详细信息
        const fullRecord = {
          ...detailData.cooperation,
          dynamic_fields: detailData.details || [],
          documents: detailData.documents || []
        };
        
        setApplication(fullRecord);
        setDocuments(detailData.documents || []);
        console.log('✅ 审核详情获取成功:', fullRecord);
      } else {
        console.error('❌ 审核详情获取失败:', response.data);
        message.error(response.data?.message || '获取审核详情失败');
      }
    } catch (error) {
      console.error('❌ 获取审核详情异常:', error);
      message.error('获取审核详情失败');
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

  // 查看文件
  const handleViewFile = (fileUrl, fileName) => {
    if (!fileUrl) {
      message.error('文件URL不存在');
      return;
    }

    console.log('🔍 查看文件:', { fileUrl, fileName });
    window.open(fileUrl, '_blank');
    message.success(`正在打开文件: ${fileName}`);
  };

  if (loading) {
    return (
      <Layout style={{ background: 'transparent' }}>
        <Content style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout style={{ background: 'transparent' }}>
        <Content style={{ padding: '24px', textAlign: 'center' }}>
          <Text type="secondary">未找到申请信息</Text>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ background: 'transparent' }}>
      <Header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '0 24px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '0 0 20px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          margin: 0,
          lineHeight: '64px',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          商家合作审核详情
        </h1>
      </Header>
      
      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          {/* 页面头部 */}
          <div style={{ marginBottom: '24px' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  border: 'none',
                  color: 'white'
                }}
              >
                返回
              </Button>
              <Title level={3} style={{ 
                margin: 0,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700
              }}>
                审核详情
              </Title>
              {getStatusTag(application.status)}
            </Space>
          </div>

          {/* 材料清单 */}
          {documents.length > 0 && (
            <div className="modern-card" style={{ marginBottom: '24px', padding: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <div style={{
                  width: '8px',
                  height: '32px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '4px',
                  marginRight: '16px'
                }} />
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#2c3e50'
                }}>
                  📄 材料清单
                </h2>
              </div>
              
              <Row gutter={[16, 16]}>
                {documents.map((doc, index) => (
                  <Col span={8} key={doc.id || index}>
                    <Card size="small" hoverable style={{ borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{doc.original_name || doc.file_name}</span>
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewFile(doc.file_url, doc.file_name)}
                          style={{
                            borderRadius: '8px',
                            background: 'linear-gradient(45deg, #667eea, #764ba2)',
                            border: 'none'
                          }}
                        >
                          查看
                        </Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* 基础信息 */}
          <div className="modern-card" style={{ marginBottom: '24px', padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{
                width: '8px',
                height: '32px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: '4px',
                marginRight: '16px'
              }} />
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: '#2c3e50'
              }}>
                🏢 基础信息
              </h2>
            </div>

            <Descriptions column={2} bordered style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Descriptions.Item label="公司名称" span={2}>
                <span style={{ fontWeight: 600, color: '#2c3e50' }}>{application.company_name}</span>
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
                <Tag color="geekblue" style={{ borderRadius: '12px' }}>{getMerchantTypeDisplayName(application.merchant_type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>
                {formatTime(application.submitted_at)}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* 详细信息 */}
          <div className="modern-card" style={{ marginBottom: '24px', padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{
                width: '8px',
                height: '32px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: '4px',
                marginRight: '16px'
              }} />
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: '#2c3e50'
              }}>
                📋 详细信息
              </h2>
            </div>

            {application.dynamic_fields && application.dynamic_fields.length > 0 ? (
              <Descriptions column={1} bordered style={{ borderRadius: '12px', overflow: 'hidden' }}>
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
                color: '#999',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                borderRadius: '12px',
                border: '1px solid rgba(102, 126, 234, 0.1)'
              }}>
                暂无详细信息
              </div>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ReviewDetailPage;
