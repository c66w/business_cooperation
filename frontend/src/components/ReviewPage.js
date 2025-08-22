import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Descriptions,
  List,
  Tag,
  message
} from 'antd';
import {
  EyeOutlined,
  FileTextOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import axios from 'axios';

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

  // 查看详情
  const handleViewDetail = (record) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  // 查看文件
  const handleViewFile = (fileUrl, fileName) => {
    // 在新窗口中打开文件进行查看
    window.open(fileUrl, '_blank');
    message.success(`正在打开文件: ${fileName}`);
  };

  // 下载文件
  const handleDownload = (fileUrl, fileName) => {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`正在下载文件: ${fileName}`);
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

      {/* 详情模态框 */}
      <Modal
        title="商家合作详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {currentRecord && (
          <div>
            <div className="modal-section">
              <Descriptions title="基本信息" bordered column={2}>
                <Descriptions.Item label="用户ID">{currentRecord.user_id}</Descriptions.Item>
                <Descriptions.Item label="公司名称">{currentRecord.company_name}</Descriptions.Item>
                <Descriptions.Item label="联系人姓名">{currentRecord.attendee_name}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{currentRecord.contact_info}</Descriptions.Item>
                <Descriptions.Item label="公司职务">{currentRecord.attendee_job}</Descriptions.Item>
                <Descriptions.Item label="行业运营">{currentRecord.industry_operator}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="modal-section">
              <div className="document-list">
                <h3>
                  资质文档
                  <Tag color="blue" className="status-tag">
                    共 {currentRecord.documents?.length || 0} 个文档
                  </Tag>
                </h3>
                {currentRecord.documents && currentRecord.documents.length > 0 ? (
                  <List
                    dataSource={currentRecord.documents}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewFile(item.file_url, item.file_name)}
                            style={{ color: '#52c41a' }}
                          >
                            查看
                          </Button>,
                          <Button
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(item.file_url, item.file_name)}
                            style={{ color: '#1890ff' }}
                          >
                            下载
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                          title={
                            <span
                              style={{
                                fontWeight: 500,
                                color: '#1890ff',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              onClick={() => handleViewFile(item.file_url, item.file_name)}
                              title="点击查看文件"
                            >
                              {item.file_name}
                            </span>
                          }
                          description={
                            <div>
                              <div>文件类型: <Tag color="geekblue">{item.file_type.toUpperCase()}</Tag></div>
                              <div style={{ marginTop: 4 }}>上传时间: {item.upload_time}</div>
                              <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
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
              </div>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
};

export default ReviewPage;
