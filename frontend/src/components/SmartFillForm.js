/**
 * 智能填写表单组件
 * 基于LLM分析结果自动填写表单字段
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Space,
  Tag,
  List,
  Modal,
  message,
  Progress,
  Tooltip,
  Switch,
  Divider
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';

const SmartFillForm = ({ 
  form, 
  suggestions = [], 
  onFieldsUpdated,
  disabled = false 
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [autoFillInProgress, setAutoFillInProgress] = useState(false);

  // 过滤掉不应该显示给用户的内部字段
  const hiddenFields = ['id', 'user_id', 'created_at', 'updated_at'];

  const visibleSuggestions = Array.isArray(suggestions)
    ? suggestions.filter(s => !hiddenFields.includes(s.field_name))
    : [];

  // 初始化选中高置信度的建议
  useEffect(() => {
    if (visibleSuggestions.length > 0) {
      const highConfidenceSuggestions = visibleSuggestions.filter(s => s.confidence >= 0.8);
      setSelectedSuggestions(highConfidenceSuggestions.map(s => s.field_name));
    }
  }, [suggestions]);

  // 获取置信度颜色
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'orange';
    return 'red';
  };

  // 获取置信度文本
  const getConfidenceText = (confidence) => {
    if (confidence >= 0.9) return '高';
    if (confidence >= 0.7) return '中';
    return '低';
  };

  // 切换建议选择状态
  const toggleSuggestion = (fieldName, checked) => {
    if (checked) {
      setSelectedSuggestions([...selectedSuggestions, fieldName]);
    } else {
      setSelectedSuggestions(selectedSuggestions.filter(name => name !== fieldName));
    }
  };

  // 预览将要填写的内容
  const handlePreview = () => {
    setPreviewVisible(true);
  };

  // 执行自动填写
  const handleAutoFill = async () => {
    if (selectedSuggestions.length === 0) {
      message.warning('请至少选择一个建议进行填写');
      return;
    }

    setAutoFillInProgress(true);

    try {
      // 准备填写的数据
      const fillData = {};
      if (Array.isArray(suggestions)) {
        suggestions.forEach(suggestion => {
          if (selectedSuggestions.includes(suggestion.field_name)) {
            fillData[suggestion.field_name] = suggestion.suggested_value;
          }
        });
      }

      // 逐个填写字段，模拟渐进式填写效果
      const fieldNames = Object.keys(fillData);
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldName = fieldNames[i];
        const value = fillData[fieldName];
        
        // 延迟填写，创建动画效果
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 填写字段
        form.setFieldValue(fieldName, value);
        
        // 触发字段变化事件
        form.validateFields([fieldName]).catch(() => {});
      }

      message.success(`成功填写 ${fieldNames.length} 个字段`);
      
      // 回调通知父组件
      if (onFieldsUpdated) {
        onFieldsUpdated(fillData);
      }

    } catch (error) {
      console.error('自动填写失败:', error);
      message.error('自动填写失败');
    } finally {
      setAutoFillInProgress(false);
    }
  };

  // 如果没有建议，不显示组件
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>🤖 智能填写建议</span>
          <Tag color="blue">{suggestions.length} 个建议</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<EyeOutlined />}
            onClick={handlePreview}
            disabled={selectedSuggestions.length === 0}
          >
            预览
          </Button>
          <Button 
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleAutoFill}
            loading={autoFillInProgress}
            disabled={disabled || selectedSuggestions.length === 0}
          >
            {autoFillInProgress ? '填写中...' : '一键填写'}
          </Button>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        
        {/* 统计信息 */}
        <div style={{ 
          padding: 12, 
          backgroundColor: '#f6ffed', 
          borderRadius: 6,
          border: '1px solid #b7eb8f'
        }}>
          <Space>
            <span>📊 分析结果:</span>
            <Tag color="green">
              {visibleSuggestions.filter(s => s.confidence >= 0.8).length} 个高置信度
            </Tag>
            <Tag color="orange">
              {visibleSuggestions.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length} 个中置信度
            </Tag>
            <Tag color="red">
              {visibleSuggestions.filter(s => s.confidence < 0.6).length} 个低置信度
            </Tag>
          </Space>
        </div>

        {/* 建议列表 */}
        <List
          size="small"
          dataSource={visibleSuggestions}
          renderItem={suggestion => (
            <List.Item
              actions={[
                <Switch
                  size="small"
                  checked={selectedSuggestions.includes(suggestion.field_name)}
                  onChange={(checked) => toggleSuggestion(suggestion.field_name, checked)}
                  disabled={disabled}
                />
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span style={{ fontWeight: 500 }}>
                      {getFieldDisplayName(suggestion.field_name)}
                    </span>
                    <Tag 
                      color={getConfidenceColor(suggestion.confidence)}
                      size="small"
                    >
                      {getConfidenceText(suggestion.confidence)} {(suggestion.confidence * 100).toFixed(0)}%
                    </Tag>
                  </Space>
                }
                description={
                  <div style={{ 
                    maxWidth: 400, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {getDisplayValue(suggestion)}
                  </div>
                }
              />
            </List.Item>
          )}
        />

        {/* 操作提示 */}
        {selectedSuggestions.length > 0 && (
          <div style={{ 
            padding: 8, 
            backgroundColor: '#e6f7ff', 
            borderRadius: 4,
            fontSize: '12px',
            color: '#1890ff'
          }}>
            💡 已选择 {selectedSuggestions.length} 个字段进行自动填写
          </div>
        )}
      </Space>

      {/* 预览模态框 */}
      <Modal
        title="📋 填写预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            取消
          </Button>,
          <Button 
            key="fill" 
            type="primary" 
            onClick={() => {
              setPreviewVisible(false);
              handleAutoFill();
            }}
            disabled={disabled}
          >
            确认填写
          </Button>
        ]}
        width={600}
      >
        <div>
          <p>以下字段将被自动填写:</p>
          <List
            size="small"
            dataSource={visibleSuggestions.filter(s => selectedSuggestions.includes(s.field_name))}
            renderItem={suggestion => (
              <List.Item>
                <List.Item.Meta
                  title={getFieldDisplayName(suggestion.field_name)}
                  description={getDisplayValue(suggestion)}
                />
                <Tag color={getConfidenceColor(suggestion.confidence)}>
                  {(suggestion.confidence * 100).toFixed(0)}%
                </Tag>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </Card>
  );
};

// 字段名称映射
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
    'accept_online_exclusive': '接受线上独家'
  };

  return fieldMap[fieldName] || fieldName;
};

// 商家类型值转换
const getMerchantTypeDisplayValue = (value) => {
  const typeMap = {
    'factory': '🏭 生产工厂',
    'brand': '🏷️ 品牌商',
    'agent': '🤝 代理商',
    'dealer': '📦 经销商',
    'operator': '🔧 代运营商'
  };
  return typeMap[value] || value;
};

// 获取显示值（特殊处理merchant_type）
const getDisplayValue = (suggestion) => {
  if (suggestion.field_name === 'merchant_type') {
    return getMerchantTypeDisplayValue(suggestion.suggested_value);
  }
  return suggestion.suggested_value;
};

export default SmartFillForm;
