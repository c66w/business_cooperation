/**
 * 文档上传组件
 * 支持文档上传和管理
 */

import React, { useState } from 'react';
import {
  Upload,
  List,
  message,
  Progress,
  Button
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Dragger } = Upload;

const DocumentUpload = ({
  onDocumentUploaded,
  sharedFileList = []
}) => {
  const { apiRequest, addDocuments } = useAuth();

  // 状态管理
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 文件选择处理
  const handleFileSelect = (file) => {
    setSelectedFiles(prev => {
      // 检查是否已存在
      const exists = prev.some(f => f.name === file.name && f.size === file.size);
      if (exists) {
        message.warning(`文件 ${file.name} 已存在`);
        return prev;
      }
      return [...prev, file];
    });
    return false; // 阻止自动上传
  };

  // 批量上传文件
  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    setUploading(true);
    const uploadedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress(((i + 1) / selectedFiles.length) * 100);

      try {
        const formData = new FormData();
        formData.append('document', file);

        // 使用 apiRequest 进行认证请求
        const responseData = await apiRequest('/document/upload', {
          method: 'POST',
          body: formData
          // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
        });

        if (responseData && responseData.success) {
          uploadedFiles.push(responseData.data);
          message.success(`${file.name} 上传完成`);
        } else {
          throw new Error(responseData?.message || '上传失败');
        }
      } catch (error) {
        message.error(`${file.name} 上传失败: ${error.message}`);
      }
    }

    // 上传完成后的处理
    if (uploadedFiles.length > 0) {
      // 更新全局文档状态
      addDocuments(uploadedFiles);

      setSelectedFiles([]);
      setUploadProgress(0);

      // 通知父组件
      if (onDocumentUploaded) {
        onDocumentUploaded(uploadedFiles);
      }

      message.success(`批量上传完成！成功上传 ${uploadedFiles.length} 个文件`);
    }

    setUploading(false);
  };

  // 移除选中的文件
  const handleRemoveFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 文件选择区域 */}
      <div style={{ marginBottom: '24px' }}>
        <Dragger
          beforeUpload={handleFileSelect}
          showUploadList={false}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
          multiple
          disabled={uploading}
          style={{
            borderRadius: '12px',
            border: '2px dashed #667eea',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))'
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ color: '#667eea', fontSize: '48px' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 500, color: '#2c3e50' }}>
            点击或拖拽文件到此区域选择
          </p>
          <p className="ant-upload-hint" style={{ color: '#666', fontSize: '14px' }}>
            支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB
          </p>
        </Dragger>
      </div>

      {/* 待上传文件列表 */}
      {selectedFiles.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#2c3e50',
            marginBottom: '12px'
          }}>
            📋 待上传文件 ({selectedFiles.length} 个)
          </div>
          <List
            size="small"
            dataSource={selectedFiles}
            renderItem={file => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => handleRemoveFile(file)}
                    danger
                  >
                    移除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ color: '#667eea' }} />}
                  title={file.name}
                  description={`${(file.size / 1024).toFixed(1)}KB`}
                />
              </List.Item>
            )}
          />
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleBatchUpload}
              loading={uploading}
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                paddingLeft: '24px',
                paddingRight: '24px'
              }}
            >
              {uploading ? '上传中...' : '开始上传'}
            </Button>
          </div>

          {uploading && (
            <div style={{ marginTop: '16px' }}>
              <Progress 
                percent={Math.round(uploadProgress)} 
                status="active"
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 已上传文件列表 */}
      {sharedFileList.length > 0 && (
        <div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#2c3e50',
            marginBottom: '12px'
          }}>
            ✅ 已上传文件 ({sharedFileList.length} 个)
          </div>
          <List
            size="small"
            dataSource={sharedFileList}
            renderItem={file => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      // 尝试多种可能的文件URL字段
                      const fileUrl = file.url || file.oss_url || file.file_url || file.response?.oss_url;

                      if (fileUrl) {
                        console.log('🔍 打开文件:', fileUrl);
                        window.open(fileUrl, '_blank');
                      } else {
                        console.error('❌ 文件URL不存在:', file);
                        message.error('文件URL不存在，无法查看');
                      }
                    }}
                  >
                    查看
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ color: '#52c41a' }} />}
                  title={file.name}
                  description="已上传"
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {sharedFileList.length === 0 && selectedFiles.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#999',
          fontSize: '14px'
        }}>
          暂无文件，请上传相关资质文档
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
