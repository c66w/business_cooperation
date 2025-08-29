import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Descriptions,
  List,
  message,
  Badge,
  Tabs,
  Row,
  Col,
  Statistic,
  Timeline,
  Radio,
  Typography
} from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  ProfileOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';
import { getMerchantTypeDisplayName } from '../utils/merchantTypeUtils';

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

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

const ReviewManagementPage = () => {
  const navigate = useNavigate();
  const { user, apiRequest, hasPermission } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState({});
  const [reviewers, setReviewers] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchAssignVisible, setBatchAssignVisible] = useState(false);

  // 任务状态映射
  const statusMap = {
    'pending': { text: '待审核', color: 'orange' },
    'in_progress': { text: '审核中', color: 'blue' },
    'completed': { text: '已完成', color: 'green' },
    'overdue': { text: '已超时', color: 'red' }
  };



  useEffect(() => {
    // 只有在用户已认证且有权限时才加载数据
    if (!user || !hasPermission('admin')) {
      logger.component('ReviewManagementPage', '用户未认证或无权限，跳过数据加载');
      return;
    }

    fetchTasks();
    fetchStatistics();
    fetchReviewers();
  }, [activeTab, user]);

  // 初始化时获取审核员列表
  useEffect(() => {
    // 只有在用户已认证且有权限时才加载审核员列表
    if (!user || !hasPermission('admin')) {
      logger.component('ReviewManagementPage', '用户未认证或无权限，跳过审核员列表加载');
      return;
    }

    fetchReviewers();
  }, [user]);

  /**
   * 获取任务列表
   */
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 根据activeTab构建查询参数
      let queryParams = '';
      if (activeTab !== 'all') {
        queryParams = `?status=${activeTab}`;
      }

      const response = await apiRequest(`/review/tasks${queryParams}`);
      if (response && response.success) {
        setTasks(response.data || []);
        logger.component('ReviewManagementPage', 'Tasks loaded', `${response.data?.length || 0} tasks for tab: ${activeTab}`);
      } else {
        message.error('获取任务列表失败');
        console.error('API response error:', response);
      }
    } catch (error) {
      message.error('获取任务列表失败');
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取统计数据
   */
  const fetchStatistics = async () => {
    try {
      const response = await apiRequest('/review/statistics');
      if (response && response.success) {
        setStatistics(response.data || {});
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  /**
   * 获取审核员列表
   */
  const fetchReviewers = async () => {
    try {
      logger.api('GET', '/review/reviewers');
      const response = await apiRequest('/review/reviewers');
      logger.api('GET', '/review/reviewers', response);

      if (response && response.success) {
        // 将审核员数组转换为ID到姓名的映射
        const reviewerMap = {};
        response.data.forEach(reviewer => {
          reviewerMap[reviewer.id] = reviewer.name;
        });
        logger.component('ReviewManagementPage', '审核员映射', reviewerMap);
        setReviewers(reviewerMap);
      } else {
        console.error('❌ 获取审核员失败:', response);
      }
    } catch (error) {
      console.error('❌ 获取审核员异常:', error);
    }
  };

  /**
   * 查看任务详情 - 跳转到独立详情页面
   */
  const handleViewDetail = (task) => {
    logger.component('ReviewManagementPage', '查看任务详情', { task, userRole: user?.role });
    // 跳转到独立的详情页面，而不是Modal
    navigate(`/review/detail/${task.application_id}`);
  };

  /**
   * 开始审核
   */
  const handleStartReview = (task) => {
    setSelectedTask(task);
    setReviewModalVisible(true);
    form.resetFields();
  };

  /**
   * 查看文件
   */
  const handleViewFile = (fileUrl, fileName) => {
    if (!fileUrl) {
      message.error('文件URL不存在');
      return;
    }

    logger.component('ReviewManagementPage', '查看文件', { fileUrl, fileName });

    // 直接打开OSS URL
    window.open(fileUrl, '_blank');
    message.success(`正在打开文件: ${fileName}`);
  };

  /**
   * 批量分配任务
   */
  const handleBatchAssign = async (reviewerId) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要分配的任务');
      return;
    }

    try {
      const assignments = selectedRowKeys.map(taskId => ({
        taskId,
        reviewerId
      }));

      const response = await apiRequest('/review/assign-batch', {
        method: 'POST',
        body: JSON.stringify({ assignments })
      });

      if (response && response.success) {
        message.success(`批量分配成功：${response.data.filter(r => r.success).length}/${assignments.length} 个任务`);
        setSelectedRowKeys([]);
        setBatchAssignVisible(false);
        fetchTasks();
        fetchStatistics();
      } else {
        message.error('批量分配失败');
      }
    } catch (error) {
      message.error('批量分配失败');
      console.error('Failed to batch assign tasks:', error);
    }
  };

  /**
   * 提交审核结果
   */
  const handleSubmitReview = async (values) => {
    try {
      const { decision, comment } = values;

      const response = await apiRequest('/review/submit', {
        method: 'POST',
        body: JSON.stringify({
          taskId: selectedTask.task_id,
          userId: selectedTask.user_id,
          decision,
          comment,
          reviewerId: user.userId
        })
      });

      if (response && response.success) {
        message.success('审核结果提交成功');
        setReviewModalVisible(false);
        fetchTasks();
        fetchStatistics();
      } else {
        message.error('提交审核结果失败');
      }
    } catch (error) {
      message.error('提交审核结果失败');
      console.error('Failed to submit review:', error);
    }
  };

  /**
   * 分配任务
   */
  const handleAssignTask = async (taskId, reviewerId) => {
    try {
      const response = await apiRequest('/review/assign', {
        method: 'POST',
        body: JSON.stringify({
          taskId,
          reviewerId
        })
      });

      if (response && response.success) {
        message.success('任务分配成功');
        fetchTasks();
        fetchStatistics();
      } else {
        message.error('任务分配失败');
      }
    } catch (error) {
      message.error('任务分配失败');
      console.error('Failed to assign task:', error);
    }
  };



  // 表格列定义
  const columns = [
    {
      title: '申请编号',
      dataIndex: 'application_id',
      key: 'application_id',
      width: 150,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '公司名称',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 200
    },
    {
      title: '商家类型',
      dataIndex: 'merchant_type',
      key: 'merchant_type',
      width: 100,
      render: (type) => (
        <Tag color="blue">{getMerchantTypeDisplayName(type)}</Tag>
      )
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      key: 'contact_name',
      width: 100
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 150,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '行业运营',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      width: 120,
      render: (assignee) => {
        if (!assignee) return '未分配';
        // 显示审核员花名，如果没有找到则显示ID
        return reviewers[assignee] || assignee;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {/* 管理员可以分配任务 */}
          {user?.role === 'admin' && record.status === 'pending' && (
            <Select
              placeholder="分配给..."
              style={{ width: 120 }}
              onChange={(reviewerId) => handleAssignTask(record.task_id, reviewerId)}
              value={record.assigned_to === 'admin_001' ? undefined : record.assigned_to}
            >
              {Object.entries(reviewers).map(([id, name]) => (
                <Select.Option key={id} value={id}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          )}
          {/* 审核员可以开始审核 */}
          {record.status === 'in_progress' && (
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartReview(record)}
            >
              审核
            </Button>
          )}
        </Space>
      )
    }
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
          商家合作审核管理
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
              智能审核管理系统
            </h1>
            <p style={{
              color: '#666',
              fontSize: '18px',
              marginBottom: 0,
              fontWeight: 500
            }}>
              🚀 高效管理，智能分配，让审核工作更轻松
            </p>
          </div>

          {/* 统计卡片 */}
          <Row gutter={[24, 16]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} md={6}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>待审核</span>}
                  value={statistics.pending || 0}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>审核中</span>}
                  value={statistics.in_progress || 0}
                  prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>今日完成</span>}
                  value={statistics.completed_today || 0}
                  prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stats-card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <Statistic
                  title={<span style={{ fontWeight: 600, color: '#2c3e50' }}>总完成</span>}
                  value={statistics.completed || 0}
                  prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: '28px' }}
                />
              </div>
            </Col>
          </Row>

      {/* 任务列表 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部任务" key="all" />
          <TabPane tab={<Badge count={statistics.pending || 0} offset={[10, 0]}>待审核</Badge>} key="pending" />
          <TabPane tab="审核中" key="in_progress" />
          <TabPane tab="已完成" key="completed" />
        </Tabs>

        {/* 批量操作工具栏 */}
        {user?.role === 'admin' && selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16, padding: 16, background: '#f0f2f5', borderRadius: 6 }}>
            <Space>
              <span>已选择 {selectedRowKeys.length} 个任务</span>
              <Select
                placeholder="批量分配给..."
                style={{ width: 150 }}
                onChange={handleBatchAssign}
              >
                {Object.entries(reviewers).map(([id, name]) => (
                  <Select.Option key={id} value={id}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="task_id"
          loading={loading}
          rowSelection={user?.role === 'admin' ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.status !== 'pending' || record.assigned_to !== 'admin_001'
            })
          } : undefined}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>




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
          layout="vertical"
          onFinish={handleSubmitReview}
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
        </div>
      </Content>
    </Layout>
  );
};

export default ReviewManagementPage;
