import React, { useState, useEffect } from 'react';
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
  ProfileOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

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
  const { user, apiRequest } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
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

  // 商家类型映射
  const merchantTypeMap = {
    'factory': '工厂',
    'brand': '品牌商',
    'agent': '代理商',
    'dealer': '经销商',
    'operator': '代运营商'
  };

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
    fetchReviewers();
  }, [activeTab]);

  // 初始化时获取审核员列表
  useEffect(() => {
    fetchReviewers();
  }, []);

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
        console.log('Tasks loaded:', response.data?.length || 0, 'tasks for tab:', activeTab);
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
      console.log('🔍 开始获取审核员列表...');
      const response = await apiRequest('/review/reviewers');
      console.log('📋 审核员API响应:', response);

      if (response && response.success) {
        // 将审核员数组转换为ID到姓名的映射
        const reviewerMap = {};
        response.data.forEach(reviewer => {
          reviewerMap[reviewer.id] = reviewer.name;
        });
        console.log('👥 审核员映射:', reviewerMap);
        setReviewers(reviewerMap);
      } else {
        console.error('❌ 获取审核员失败:', response);
      }
    } catch (error) {
      console.error('❌ 获取审核员异常:', error);
    }
  };

  /**
   * 查看任务详情
   */
  const handleViewDetail = async (task) => {
    try {
      console.log('🔍 查看任务详情:', task, '当前用户角色:', user?.role);

      // 管理员和审核员都使用审核员API（管理员也是审核员）
      console.log('🔍 查看任务详情，任务ID:', task.task_id);
      const response = await apiRequest(`/reviewer/task/${task.task_id}/application`);

      if (response && response.success) {
        setSelectedTask({
          ...task,
          ...response.data
        });
        setDetailModalVisible(true);
        console.log('✅ 获取任务详情成功:', response.data);
      } else {
        message.error('获取详情失败');
        console.error('❌ 获取详情失败:', response);
      }
    } catch (error) {
      message.error('获取详情失败');
      console.error('❌ 获取详情异常:', error);
    }
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

    console.log('查看文件:', { fileUrl, fileName });

    // 在新窗口中打开文件进行查看
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
      dataIndex: 'user_id',
      key: 'user_id',
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
        <Tag color="blue">{merchantTypeMap[type] || type}</Tag>
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
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核"
              value={statistics.pending || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="审核中"
              value={statistics.in_progress || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日完成"
              value={statistics.completed_today || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总完成"
              value={statistics.completed || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Card>
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

      {/* 详情模态框 */}
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
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            size="large"
            onClick={() => setDetailModalVisible(false)}
            style={{ minWidth: '100px' }}
          >
            关闭
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        {selectedTask && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px 0' }}>
            {/* 基本信息卡片 */}
            <Card
              title={
                <div style={{ color: '#1890ff', fontWeight: 600 }}>
                  <UserOutlined style={{ marginRight: 8 }} />
                  基本信息
                </div>
              }
              style={{
                marginBottom: 24,
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
              headStyle={{
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                borderRadius: '12px 12px 0 0'
              }}
            >
              <Row gutter={[24, 16]}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>用户ID</Text>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#262626',
                      fontFamily: 'Monaco, monospace',
                      background: '#f5f5f5',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}>
                      {selectedTask.user_id}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>公司名称</Text>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1890ff',
                      marginTop: '4px'
                    }}>
                      {selectedTask.company_name}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>联系人姓名</Text>
                    <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px' }}>
                      {selectedTask.contact_name}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>联系电话</Text>
                    <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px' }}>
                      {selectedTask.contact_phone}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>商家类型</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag
                        color="blue"
                        style={{
                          fontSize: '14px',
                          padding: '4px 12px',
                          borderRadius: '16px'
                        }}
                      >
                        {merchantTypeMap[selectedTask.merchant_type]}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>申请状态</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag
                        color={statusMap[selectedTask.status]?.color}
                        style={{
                          fontSize: '14px',
                          padding: '4px 12px',
                          borderRadius: '16px'
                        }}
                      >
                        {statusMap[selectedTask.status]?.text}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '13px' }}>提交时间</Text>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      {selectedTask.submitted_at ? new Date(selectedTask.submitted_at).toLocaleString() : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '13px' }}>联系邮箱</Text>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      {selectedTask.contact_email || '未提供'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 详细信息卡片 */}
            {selectedTask.dynamic_fields && selectedTask.dynamic_fields.length > 0 && (
              <Card
                title={
                  <div style={{ color: '#52c41a', fontWeight: 600 }}>
                    <ProfileOutlined style={{ marginRight: 8 }} />
                    详细信息
                  </div>
                }
                style={{
                  marginBottom: 24,
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
                headStyle={{
                  background: 'linear-gradient(135deg, #f6ffed, #f0f9ff)',
                  borderRadius: '12px 12px 0 0'
                }}
              >
                <Row gutter={[24, 16]}>
                  {selectedTask.dynamic_fields.map((field, index) => (
                    <Col span={24} key={index}>
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          {getFieldDisplayName(field.field_name)}
                        </Text>
                        <div style={{
                          fontSize: '15px',
                          marginTop: '4px',
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
            {selectedTask.documents && selectedTask.documents.length > 0 && (
              <Card
                title={
                  <div style={{ color: '#fa8c16', fontWeight: 600 }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    资质文档
                    <Tag
                      color="orange"
                      style={{ marginLeft: 8, borderRadius: '12px' }}
                    >
                      共 {selectedTask.documents.length} 个文档
                    </Tag>
                  </div>
                }
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
                headStyle={{
                  background: 'linear-gradient(135deg, #fff7e6, #fef9e7)',
                  borderRadius: '12px 12px 0 0'
                }}
              >
                <List
                  dataSource={selectedTask.documents}
                  renderItem={(doc, index) => (
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
                          onClick={() => handleViewFile(doc.oss_url || doc.file_url, doc.file_name)}
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
                            onClick={() => handleViewFile(doc.oss_url || doc.file_url, doc.file_name)}
                          >
                            {doc.file_name}
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                              文件类型: {doc.file_type || 'APPLICATION/PDF'}
                            </div>
                            <div style={{ color: '#8c8c8c', fontSize: '13px', marginTop: '2px' }}>
                              上传时间: {new Date(doc.upload_time).toLocaleString()}
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
              </Card>
            )}
          </div>
        )}
      </Modal>

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
  );
};

export default ReviewManagementPage;
