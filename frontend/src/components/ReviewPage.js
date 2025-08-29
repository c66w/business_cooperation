import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Tag,
  message,
  Layout,
  Row,
  Col,
  Statistic,
  Form,
  Modal,
  Radio,
  Input,
  Space
} from 'antd';
import {
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  RobotOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
const { Header, Content } = Layout;
const { TextArea } = Input;

const ReviewPage = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [reviewData, setReviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 获取审核数据
  const fetchReviewData = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/reviewer/my-tasks');
      if (response && response.success) {
        setReviewData(response.data);
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

  // 查看详情 - 跳转到独立详情页面
  const handleViewDetail = (record) => {
    console.log('🔍 查看详情，申请ID:', record.application_id);
    // 跳转到独立的详情页面，而不是Modal
    navigate(`/review/detail/${record.application_id}`);
  };

  // 开始审核
  const handleStartReview = (task) => {
    setSelectedTask(task);
    setReviewModalVisible(true);
    form.resetFields();
  };

  // 提交审核结果
  const handleSubmitReview = async (values) => {
    try {
      const response = await apiRequest(`/reviewer/submit-review/${selectedTask.task_id}`, {
        method: 'POST',
        body: JSON.stringify({
          decision: values.decision,
          comment: values.comment
        })
      });
      
      if (response && response.success) {
        message.success('审核结果提交成功');
        setReviewModalVisible(false);
        fetchReviewData(); // 刷新数据
      }
    } catch (error) {
      message.error('提交审核结果失败');
      console.error('Error submitting review:', error);
    }
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
      render: (text) => (
        <span style={{ fontWeight: 600, color: '#2c3e50' }}>{text}</span>
      ),
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
      render: (text) => (
        <Tag color="geekblue">{text}</Tag>
      ),
    },
    {
      title: '资质文档数量',
      key: 'document_count',
      width: 120,
      render: (_, record) => (
        <Tag color="blue" style={{ borderRadius: '12px' }}>
          {record.documents?.length || 0} 个文档
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetail(record)}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              border: 'none'
            }}
          >
            查看详情
          </Button>
          
          {/* 审核员可以开始审核 - 只有 in_progress 状态才显示 */}
          {record.status === 'in_progress' && (
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartReview(record)}
              style={{
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #52c41a, #73d13d)',
                border: 'none'
              }}
            >
              审核
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
          商家合作审核中心
        </h1>
      </Header>

      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
        <div className="page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* 页面标题 */}
          <div className="modern-card" style={{
            marginBottom: 32,
            padding: '40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))'
          }}>
            <h1 style={{
              marginBottom: 16,
              fontSize: '32px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700
            }}>
              <RobotOutlined style={{ color: '#667eea', marginRight: 12 }} />
              智能商家合作审核系统
            </h1>
            <p style={{
              color: '#666',
              fontSize: '18px',
              marginBottom: 0,
              fontWeight: 500
            }}>
              🚀 高效审核，智能管理，让商家合作更简单
            </p>
          </div>

          {/* 统计信息 */}
          <Row gutter={[24, 16]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} md={8}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>合作申请总数</span>}
                  value={reviewData.length}
                  prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>资质文档总数</span>}
                  value={reviewData.reduce((sum, item) => sum + (item.documents?.length || 0), 0)}
                  prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>涉及运营人员</span>}
                  value={new Set(reviewData.map(item => item.industry_operator)).size}
                  prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
          </Row>

          {/* 数据表格 */}
          <div className="modern-card" style={{ padding: '32px' }}>
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
                📋 商家合作信息列表
              </h2>
            </div>

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
              style={{
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            />
          </div>
        </div>
      </Content>
      
      {/* 审核模态框 */}
      <Modal
        title="审核商家申请"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleSubmitReview}
          layout="vertical"
        >
          <Form.Item
            name="decision"
            label="审核决定"
            rules={[{ required: true, message: '请选择审核决定' }]}
          >
            <Radio.Group>
              <Radio value="approved">通过</Radio>
              <Radio value="rejected">拒绝</Radio>
              <Radio value="changes_requested">需要修改</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item
            name="comment"
            label="审核意见"
            rules={[{ required: true, message: '请输入审核意见' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明审核意见..."
              showCount
              maxLength={500}
            />
          </Form.Item>
          

          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setReviewModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                提交审核结果
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ReviewPage;
