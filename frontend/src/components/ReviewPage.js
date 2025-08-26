import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Descriptions,
  List,
  Tag,
  message,
  Row,
  Col
} from 'antd';
import {
  EyeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';

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

const ReviewPage = () => {
  const [reviewData, setReviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  // 获取审核数据
  const fetchReviewData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/review/list');
      if (response.data.success) {
        setReviewData(response.data.data);
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      message.error('网络请求失败');
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewData();
  }, []);

  // 查看详情 - 获取完整的详情数据
  const handleViewDetail = async (record) => {
    try {
      console.log('🔍 查看详情，用户ID:', record.user_id);

      // 调用详情API获取包含dynamic_fields的完整数据
      const response = await axios.get(`/api/review/detail/${record.user_id}`);

      if (response.data.success) {
        const detailData = response.data.data;
        // 合并基础信息和详细信息
        const fullRecord = {
          ...record,
          ...detailData.cooperation,
          dynamic_fields: detailData.details || [],
          documents: detailData.documents || record.documents || []
        };

        console.log('✅ 获取详情成功:', fullRecord);
        setCurrentRecord(fullRecord);
        setDetailVisible(true);
      } else {
        message.error('获取详情失败');
        console.error('❌ 获取详情失败:', response.data);
      }
    } catch (error) {
      message.error('获取详情失败');
      console.error('❌ 获取详情异常:', error);
    }
  };

  // 查看文件
  const handleViewFile = (fileUrl, fileName) => {
    // 在新窗口中打开文件进行查看
    window.open(fileUrl, '_blank');
    message.success(`正在打开文件: ${fileName}`);
  };



  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
    },
    {
      title: '公司名称',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 200,
    },
    {
      title: '联系人',
      dataIndex: 'attendee_name',
      key: 'attendee_name',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contact_info',
      key: 'contact_info',
      width: 120,
    },
    {
      title: '职务',
      dataIndex: 'attendee_job',
      key: 'attendee_job',
      width: 120,
    },
    {
      title: '行业运营',
      dataIndex: 'industry_operator',
      key: 'industry_operator',
      width: 100,
    },
    {
      title: '资质文档数量',
      key: 'document_count',
      width: 120,
      render: (_, record) => (
        <Tag color="blue">{record.documents?.length || 0} 个文档</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* 统计信息 */}
      <div className="review-stats">
        <div className="stat-card">
          <div className="stat-number">{reviewData.length}</div>
          <div className="stat-label">合作申请</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {reviewData.reduce((sum, item) => sum + (item.documents?.length || 0), 0)}
          </div>
          <div className="stat-label">资质文档总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {new Set(reviewData.map(item => item.industry_operator)).size}
          </div>
          <div className="stat-label">涉及运营人员</div>
        </div>
      </div>

      <Card title="商家合作信息列表" className="review-card">
        <Table
          columns={columns}
          dataSource={reviewData}
          rowKey="user_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 详情模态框 - 与管理员页面保持一致 */}
      <Modal
        title={
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FileTextOutlined />
            商家合作详情
          </div>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button
            key="close"
            size="large"
            onClick={() => setDetailVisible(false)}
            style={{ minWidth: '100px' }}
          >
            关闭
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        {currentRecord && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px 0' }}>
            {/* 基本信息卡片 */}
            <Card
              title={
                <div style={{ color: '#1890ff', fontWeight: 600 }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  基本信息
                </div>
              }
              style={{
                marginBottom: 24,
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <Descriptions bordered column={2}>
                <Descriptions.Item label="用户ID">{currentRecord.user_id}</Descriptions.Item>
                <Descriptions.Item label="公司名称">{currentRecord.company_name}</Descriptions.Item>
                <Descriptions.Item label="联系人姓名">{currentRecord.attendee_name}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{currentRecord.contact_info}</Descriptions.Item>
                <Descriptions.Item label="公司职务">{currentRecord.attendee_job}</Descriptions.Item>
                <Descriptions.Item label="行业运营">{currentRecord.industry_operator}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 详细信息卡片 */}
            {currentRecord.dynamic_fields && currentRecord.dynamic_fields.length > 0 && (
              <Card
                title={
                  <div style={{ color: '#52c41a', fontWeight: 600 }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    详细信息
                  </div>
                }
                style={{
                  marginBottom: 24,
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                <Row gutter={[24, 16]}>
                  {currentRecord.dynamic_fields.map((field, index) => (
                    <Col span={24} key={index}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#8c8c8c',
                          marginBottom: '4px'
                        }}>
                          {getFieldDisplayName(field.field_name)}
                        </div>
                        <div style={{
                          fontSize: '15px',
                          padding: '8px 12px',
                          background: '#fafafa',
                          borderRadius: '6px',
                          border: '1px solid #f0f0f0'
                        }}>
                          {getFieldValue(field.field_value)}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* 资质文档卡片 */}
            <Card
              title={
                <div style={{ color: '#fa8c16', fontWeight: 600 }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  资质文档
                  <Tag
                    color="orange"
                    style={{ marginLeft: 8, borderRadius: '12px' }}
                  >
                    共 {currentRecord.documents?.length || 0} 个文档
                  </Tag>
                </div>
              }
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              {currentRecord.documents && currentRecord.documents.length > 0 ? (
                <List
                  dataSource={currentRecord.documents}
                  renderItem={(item) => (
                    <List.Item
                      style={{
                        padding: '16px',
                        marginBottom: '8px',
                        background: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}
                      actions={[
                        <Button
                          type="primary"
                          ghost
                          icon={<EyeOutlined />}
                          onClick={() => handleViewFile(item.file_url, item.file_name)}
                          style={{ borderRadius: '6px' }}
                        >
                          查看
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 40,
                            height: 40,
                            background: 'linear-gradient(135deg, #ff9a9e, #fecfef)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FileTextOutlined style={{ color: '#fff', fontSize: '18px' }} />
                          </div>
                        }
                        title={
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: 500,
                              color: '#262626',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleViewFile(item.file_url, item.file_name)}
                          >
                            {item.file_name}
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                              文件类型: {item.file_type?.toUpperCase() || 'APPLICATION/PDF'}
                            </div>
                            <div style={{ color: '#8c8c8c', fontSize: '13px', marginTop: '2px' }}>
                              上传时间: {item.upload_time}
                            </div>
                            <div style={{
                              color: '#1890ff',
                              fontSize: '12px',
                              marginTop: '4px'
                            }}>
                              💡 点击文件名或"查看"按钮可在线查看文件
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无资质文档
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>


    </div>
  );
};

export default ReviewPage;
