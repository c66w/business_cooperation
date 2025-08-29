import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Radio,
  Checkbox,
  Button,
  Upload,
  message,
  Card,
  Steps,
  Row,
  Col
} from 'antd';
import {
  RobotOutlined,
  InboxOutlined,
  SaveOutlined,
  SendOutlined
} from '@ant-design/icons';
import { getFieldsByType } from '../config/merchant-fields';
import axios from 'axios';
import logger from '../utils/logger';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const DynamicForm = ({
  onSubmit,
  initialData = {},
  onMerchantTypeChange,
  onFormRef,
  initialFileList = [],
  onFileListChange,
  smartSuggestions = [],
  onRequestSmartFill,
  autoFillData,
  onAutoFillComplete
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [merchantType, setMerchantType] = useState('');
  const [dynamicFields, setDynamicFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState(initialFileList);
  const [allFormData, setAllFormData] = useState({}); // 保存所有步骤的数据

  // 商家类型选项
  const merchantTypes = [
    { value: 'factory', label: '🏭 生产工厂' },
    { value: 'brand', label: '🏷️ 品牌商' },
    { value: 'agent', label: '🤝 代理商' },
    { value: 'dealer', label: '📦 经销商' },
    { value: 'operator', label: '🔧 代运营商' }
  ];

  // 产品品类选项
  const productCategories = [
    '3C数码家电',
    '本地生活',
    '宠物生活',
    '服饰箱包',
    '个护家清',
    '家居百货',
    '礼品文创',
    '运动户外',
    '家装家具',
    '酒水',
    '美妆',
    '母婴童装',
    '汽摩生活',
    '生鲜',
    '食品饮料',
    '手表配饰',
    '图书教育',
    '玩具乐器',
    '虚拟充值',
    '珠宝文玩',
    '滋补保健',
    '其它'
  ];

  useEffect(() => {
    // 如果有初始数据，填充表单
    if (initialData && Object.keys(initialData).length > 0) {
      form.setFieldsValue(initialData);
      if (initialData.merchant_type) {
        setMerchantType(initialData.merchant_type);
        loadDynamicFields(initialData.merchant_type);
      }
    }

    // 传递表单引用给父组件
    if (onFormRef) {
      onFormRef(form);
    }
  }, [initialData, form, onFormRef]);

  // 处理自动填充数据
  useEffect(() => {
    if (autoFillData && Object.keys(autoFillData).length > 0) {
      console.log('🔧 DynamicForm接收到自动填充数据:', autoFillData);

      // 过滤掉null和undefined的字段
      const validFields = {};
      Object.keys(autoFillData).forEach(key => {
        if (autoFillData[key] !== null && autoFillData[key] !== undefined && autoFillData[key] !== '') {
          validFields[key] = autoFillData[key];
        }
      });

      if (Object.keys(validFields).length > 0) {
        // 使用setFieldsValue自动填充表单
        form.setFieldsValue(validFields);
        console.log('✅ 表单字段自动填充完成:', validFields);

        // 通知父组件填充完成
        if (onAutoFillComplete) {
          onAutoFillComplete();
        }
      }
    }
  }, [autoFillData, form, onAutoFillComplete]);

  // 同步文件列表
  useEffect(() => {
    setFileList(initialFileList);
  }, [initialFileList]);

  /**
   * 加载动态字段配置
   */
  const loadDynamicFields = async (type) => {
    logger.api('GET', `/api/form/fields/${type}`, { type });
    try {
      const response = await axios.get(`/api/form/fields/${type}`);
      logger.api('GET', `/api/form/fields/${type}`, response.data);
      if (response.data.success && response.data.data) {
        logger.form('DynamicForm', '从API加载的动态字段', response.data.data);
        setDynamicFields(response.data.data);
      } else {
        console.error('API返回数据格式异常');
        setDynamicFields([]);
      }
    } catch (error) {
      console.error('API调用失败:', error);
      // 如果API失败，使用本地配置作为备用方案
      const fallbackFields = getFieldsByType(type).map(field => ({
        field_name: field.name,
        field_label: field.label,
        field_type: field.type,
        is_required: field.required,
        field_options: field.options,
        placeholder: field.placeholder
      }));
      setDynamicFields(fallbackFields);
    }
  };

  /**
   * 商家类型变化处理
   */
  const handleMerchantTypeChange = (value) => {
    logger.form('DynamicForm', '商家类型变化', value);
    setMerchantType(value);
    loadDynamicFields(value);

    // 通知父组件商家类型变化
    if (onMerchantTypeChange) {
      onMerchantTypeChange(value);
    }

    // 清空之前的动态字段值
    const currentValues = form.getFieldsValue();
    const newValues = {};

    // 保留基础字段
    const basicFields = ['company_name', 'product_category', 'specific_products', 'contact_name', 'contact_phone', 'contact_email', 'merchant_type', 'cooperation_requirements', 'industry_operator_contact'];
    basicFields.forEach(field => {
      if (currentValues[field] !== undefined) {
        newValues[field] = currentValues[field];
      }
    });

    newValues.merchant_type = value;
    form.setFieldsValue(newValues);
  };

  /**
   * 渲染动态字段
   */
  const renderDynamicField = (field) => {
    const {
      field_name: name,
      field_label: label,
      field_type: type,
      is_required: required,
      field_options: options,
      placeholder
    } = field;

    const commonProps = {
      name,
      label,
      rules: required ? [{ required: true, message: `请输入${label}` }] : []
    };

    switch (type) {
      case 'text':
        return (
          <Form.Item key={name} {...commonProps}>
            <Input placeholder={placeholder || `请输入${label}`} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item key={name} {...commonProps}>
            <TextArea 
              rows={4} 
              placeholder={placeholder || `请输入${label}`}
              showCount
              maxLength={1000}
            />
          </Form.Item>
        );

      case 'radio':
        return (
          <Form.Item key={name} {...commonProps}>
            <Radio.Group>
              {options?.map(option => (
                <Radio key={option} value={option}>{option}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item key={name} {...commonProps}>
            <Select placeholder={`请选择${label}`}>
              {options?.map(option => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item key={name} {...commonProps}>
            <Checkbox.Group options={options} />
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={name} {...commonProps}>
            <Input placeholder={placeholder || `请输入${label}`} />
          </Form.Item>
        );
    }
  };

  /**
   * 处理文件删除
   */
  const handleFileRemove = async (file) => {
    try {
      // 如果文件有document_id，说明已经上传到服务器，需要调用删除API
      if (file.response && file.response.data && file.response.data.document_id) {
        const documentId = file.response.data.document_id;

        logger.api('DELETE', `/api/document/delete/${documentId}`, { documentId });

        const response = await axios.delete(`/api/document/delete/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.success) {
          message.success(`文档 ${file.name} 删除成功`);
        } else {
          throw new Error(response.data.message || '删除失败');
        }
      }

      // 从文件列表中移除
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);

      // 同步到父组件
      if (onFileListChange) {
        onFileListChange(newFileList);
      }

      return true;

    } catch (error) {
      console.error('删除文档失败:', error);
      message.error(`删除文档失败: ${error.message}`);
      return false;
    }
  };

  /**
   * 文件上传配置
   */
  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isValidType = [
        'application/pdf', // PDF
        'application/msword', // DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/epub+zip', // EPUB
        'text/plain', // TXT
        'text/html', // HTML
        'text/xml', // XML
        'text/markdown', // MD
        'application/json', // JSON
        'text/csv', // CSV
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'application/vnd.ms-excel', // XLS
        'text/tab-separated-values', // TSV
        'image/png', // PNG
        'image/jpeg', // JPG/JPEG
        'image/jpg' // JPG
      ].includes(file.type);
      
      if (!isValidType) {
        message.error('只支持上传 PDF、Word、Excel、EPUB、文本、图片等格式的文件！');
        return false;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 100;
      if (!isLt10M) {
        message.error('文件大小不能超过 100MB！');
        return false;
      }
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList);
      // 同步到父组件
      if (onFileListChange) {
        onFileListChange(info.fileList);
      }
    },
    onRemove: (file) => {
      return handleFileRemove(file);
    }
  };

  /**
   * 保存当前步骤数据
   */
  const saveCurrentStepData = () => {
    const currentValues = form.getFieldsValue();
    setAllFormData(prev => ({ ...prev, ...currentValues }));
    logger.form('DynamicForm', '保存当前步骤数据', currentValues);
  };

  /**
   * 下一步
   */
  const nextStep = async () => {
    if (currentStep < 2) {
      // 验证当前步骤的必填字段
      if (currentStep === 0) {
        try {
          await form.validateFields(['merchant_type']);
        } catch (error) {
          logger.form('DynamicForm', '第一步验证失败', error);
          return;
        }
      }

      saveCurrentStepData(); // 保存当前步骤数据
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * 上一步
   */
  const prevStep = () => {
    if (currentStep > 0) {
      saveCurrentStepData(); // 保存当前步骤数据
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * 表单提交
   */
  const handleSubmit = async (values) => {
    try {
      logger.form('DynamicForm', '开始提交表单', values);
      setLoading(true);

      // 合并所有步骤的数据
      const allData = { ...allFormData, ...values };

      logger.form('DynamicForm', '提交的完整数据', allData);

      // 准备表单数据
      const formData = new FormData();

      // 添加表单字段
      Object.keys(allData).forEach(key => {
        if (allData[key] !== undefined && allData[key] !== null) {
          if (Array.isArray(allData[key])) {
            formData.append(key, JSON.stringify(allData[key]));
          } else {
            formData.append(key, allData[key]);
          }
        }
      });

      // 添加文件
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      // 调用提交回调
      if (onSubmit) {
        await onSubmit(formData);
      }

      message.success('表单提交成功！');
    } catch (error) {
      console.error('Form submission failed:', error);
      message.error('表单提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存草稿
   */
  const handleSaveDraft = async () => {
    try {
      await form.validateFields();
      // 这里可以调用保存草稿的API
      message.success('草稿保存成功！');
    } catch (error) {
      console.error('Save draft failed:', error);
    }
  };

  const steps = [
    {
      title: '基础信息',
      content: 'basic-info'
    },
    {
      title: '详细信息',
      content: 'detailed-info'
    },
    {
      title: '资质文档',
      content: 'documents'
    }
  ];

  return (
    <div className="dynamic-form">
      {/* 美化的步骤条 */}
      <div className="modern-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <Steps
          current={currentStep}
          className="modern-steps"
          style={{ marginBottom: 0 }}
        >
          {steps.map(item => (
            <Steps.Step
              key={item.title}
              title={<span style={{ fontWeight: 600 }}>{item.title}</span>}
            />
          ))}
        </Steps>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onFinishFailed={(errorInfo) => {
          console.error('❌ 表单验证失败:', errorInfo);
          message.error('请检查并填写所有必填字段');
        }}
        initialValues={initialData}
        className="modern-form"
        onValuesChange={(changedValues, allValues) => {
          // 监听商家类型字段变化
          if (changedValues.merchant_type && changedValues.merchant_type !== merchantType) {
            logger.form('DynamicForm', 'onValuesChange检测到商家类型变化', changedValues.merchant_type);
            setMerchantType(changedValues.merchant_type);
            loadDynamicFields(changedValues.merchant_type);

            // 通知父组件
            if (onMerchantTypeChange) {
              onMerchantTypeChange(changedValues.merchant_type);
            }
          }

          // 额外检查：如果allValues中有merchant_type但状态为空，也要同步
          if (allValues.merchant_type && !merchantType && !changedValues.merchant_type) {
            logger.form('DynamicForm', 'onValuesChange检测到状态不同步，修复中', allValues.merchant_type);
            setMerchantType(allValues.merchant_type);
            loadDynamicFields(allValues.merchant_type);

            if (onMerchantTypeChange) {
              onMerchantTypeChange(allValues.merchant_type);
            }
          }
        }}
      >
        {/* 第一步：基础信息 */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 600 }}>
                <div style={{
                  width: '8px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '4px',
                  marginRight: '12px'
                }} />
                商家基础信息
              </div>
            }
            className="modern-card"
            style={{ marginBottom: 24 }}
          >
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <Form.Item
                  name="company_name"
                  label="公司名称"
                  rules={[{ required: true, message: '请输入公司名称' }]}
                >
                  <Input placeholder="企业营业执照上的主体名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="merchant_type"
                  label="商家类型"
                  rules={[{ required: true, message: '请选择商家类型' }]}
                >
                  <Select
                    placeholder="请选择商家类型"
                    value={merchantType}
                    onChange={handleMerchantTypeChange}
                  >
                    {merchantTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="product_category"
                  label="产品品类"
                  rules={[{ required: true, message: '请选择产品品类' }]}
                >
                  <Select placeholder="请选择产品品类">
                    {productCategories.map(category => (
                      <Option key={category} value={category}>
                        {category}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="specific_products"
                  label="具体产品"
                  rules={[{ required: true, message: '请输入具体产品' }]}
                >
                  <Input placeholder="填写示例：面膜、护手霜、燕窝" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="contact_name"
                  label="联系人姓名"
                  rules={[{ required: true, message: '请输入联系人姓名' }]}
                >
                  <Input placeholder="请输入联系人姓名" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="contact_phone"
                  label="联系人电话"
                  rules={[
                    { required: true, message: '请输入联系人电话' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                  ]}
                >
                  <Input placeholder="请输入联系人电话" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="contact_email"
                  label="联系人邮箱"
                  rules={[
                    { type: 'email', message: '请输入正确的邮箱地址' }
                  ]}
                >
                  <Input placeholder="请输入联系人邮箱" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="cooperation_requirements"
              label="和遥望合作诉求"
            >
              <Input.TextArea
                rows={4}
                placeholder="请描述您的合作诉求，例如：直播、短视频、共创品牌、热荔（润物云）即时零售、海外业务、私域等"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item
              name="industry_operator_contact"
              label="对接行业运营花名"
            >
              <Input placeholder="没有填无，填写具体遥望对接人花名" />
            </Form.Item>
          </Card>

          {/* 第一步操作按钮 */}
          <div className="modern-card" style={{
            textAlign: 'center',
            marginTop: 32,
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.8)'
          }}>
            {currentStep < steps.length - 1 && (
              <Button
                type="primary"
                size="large"
                className="gradient-button"
                onClick={nextStep}
                disabled={false}
                style={{
                  height: '48px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  fontWeight: 500,
                  fontSize: '16px'
                }}
              >
                下一步
              </Button>
            )}
          </div>

          {/* 基础信息智能分析 */}
          {smartSuggestions.filter(s => s.stage === 'basic').length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 600 }}>
                    <div style={{
                      width: '8px',
                      height: '24px',
                      background: 'linear-gradient(45deg, #52c41a, #73d13d)',
                      borderRadius: '4px',
                      marginRight: '12px'
                    }} />
                    <RobotOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    智能分析建议 - 基础信息
                  </div>
                }
                className="modern-card"
                style={{ marginBottom: 24 }}
              >
                <div style={{ padding: '16px 0' }}>
                  {smartSuggestions
                    .filter(s => s.stage === 'basic')
                    .map((suggestion, index) => (
                      <div key={index} style={{
                        padding: '12px 16px',
                        marginBottom: '8px',
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}>
                        💡 {typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion.content || JSON.stringify(suggestion)}
                      </div>
                    ))
                  }
                </div>
              </Card>
            </div>
          )}

          {/* 智能分析请求按钮 */}
          {onRequestSmartFill && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                type="dashed"
                icon={<RobotOutlined />}
                onClick={() => onRequestSmartFill('basic')}
                style={{
                  borderColor: '#52c41a',
                  color: '#52c41a',
                  borderRadius: '8px',
                  height: '40px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
              >
                🤖 智能分析基础信息
              </Button>
            </div>
          )}
        </div>

        {/* 第二步：详细信息 */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          {(() => {
            // 检查表单值与状态的一致性
            const formMerchantType = form.getFieldValue('merchant_type');
            logger.debug('=== 第二步渲染调试信息 ===');
            logger.debug('merchantType状态:', merchantType);
            logger.debug('表单merchant_type值:', formMerchantType);
            logger.debug('dynamicFields.length:', dynamicFields.length);

            // 如果表单有值但状态为空，自动同步
            if (formMerchantType && !merchantType) {
              logger.form('DynamicForm', '检测到状态不同步，自动修复', formMerchantType);
              setTimeout(() => {
                setMerchantType(formMerchantType);
                loadDynamicFields(formMerchantType);
              }, 0);
            }
            logger.debug('=========================');
            return null;
          })()}
          {merchantType ? (
            dynamicFields.length > 0 ? (
              <div>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 600 }}>
                      <div style={{
                        width: '8px',
                        height: '24px',
                        background: 'linear-gradient(45deg, #667eea, #764ba2)',
                        borderRadius: '4px',
                        marginRight: '12px'
                      }} />
                      {`${merchantTypes.find(t => t.value === merchantType)?.label}详细信息`}
                    </div>
                  }
                  className="modern-card"
                  style={{ marginBottom: 24 }}
                >
                  <Row gutter={[24, 16]}>
                    {dynamicFields.map(field => (
                      <Col span={field.type === 'textarea' ? 24 : 12} key={field.name}>
                        {renderDynamicField(field)}
                      </Col>
                    ))}
                  </Row>
                </Card>

                {/* 详细信息智能分析 */}
                {smartSuggestions.filter(s => s.stage === 'detailed').length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <Card
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 600 }}>
                          <div style={{
                            width: '8px',
                            height: '24px',
                            background: 'linear-gradient(45deg, #52c41a, #73d13d)',
                            borderRadius: '4px',
                            marginRight: '12px'
                          }} />
                          <RobotOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                          智能分析建议 - 详细信息
                        </div>
                      }
                      className="modern-card"
                      style={{ marginBottom: 24 }}
                    >
                      <div style={{ padding: '16px 0' }}>
                        {smartSuggestions
                          .filter(s => s.stage === 'detailed')
                          .map((suggestion, index) => (
                            <div key={index} style={{
                              padding: '12px 16px',
                              marginBottom: '8px',
                              background: '#f6ffed',
                              border: '1px solid #b7eb8f',
                              borderRadius: '8px',
                              fontSize: '14px',
                              lineHeight: '1.6'
                            }}>
                              💡 {typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion.content || JSON.stringify(suggestion)}
                            </div>
                          ))
                        }
                      </div>
                    </Card>
                  </div>
                )}


              </div>
            ) : (
              <div className="modern-card" style={{
                padding: '40px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1), rgba(102, 126, 234, 0.1))'
              }}>
                <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                  正在加载 {merchantTypes.find(t => t.value === merchantType)?.label} 的详细信息字段...
                </div>
                <Button
                  type="primary"
                  onClick={() => loadDynamicFields(merchantType)}
                  style={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  重新加载字段
                </Button>
              </div>
            )
          ) : (
            <div className="modern-card" style={{
              padding: '40px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(245, 34, 45, 0.1), rgba(102, 126, 234, 0.1))'
            }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                请先在第一步选择商家类型
              </div>
              <div style={{ fontSize: '14px', color: '#999' }}>
                选择商家类型后，系统将显示对应的详细信息字段
              </div>
            </div>
          )}

          {/* 第二步操作按钮 */}
          <div className="modern-card" style={{
            textAlign: 'center',
            marginTop: 32,
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.8)'
          }}>
            {currentStep > 0 && (
              <Button
                size="large"
                style={{
                  marginRight: 16,
                  borderRadius: '8px',
                  height: '48px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  fontWeight: 500
                }}
                onClick={prevStep}
              >
                上一步
              </Button>
            )}

            {currentStep < steps.length - 1 && (
              <Button
                type="primary"
                size="large"
                className="gradient-button"
                onClick={nextStep}
                disabled={false}
                style={{
                  height: '48px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  fontWeight: 500,
                  fontSize: '16px'
                }}
              >
                下一步
              </Button>
            )}
          </div>

          {/* 智能分析详细信息按钮 */}
          {onRequestSmartFill && currentStep === 1 && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                type="dashed"
                icon={<RobotOutlined />}
                onClick={() => onRequestSmartFill('detailed')}
                style={{
                  borderColor: '#52c41a',
                  color: '#52c41a',
                  borderRadius: '8px',
                  height: '40px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
              >
                🤖 智能分析详细信息
              </Button>
            </div>
          )}

        </div>

        {/* 第三步：资质文档 */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 600 }}>
                <div style={{
                  width: '8px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '4px',
                  marginRight: '12px'
                }} />
                公司或产品介绍资料
              </div>
            }
            className="modern-card"
            style={{ marginBottom: 24 }}
          >
            {fileList.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2c3e50',
                  marginBottom: '12px'
                }}>
                  📎 已上传的文档 ({fileList.length} 个)
                </div>
                <div style={{
                  background: 'rgba(102, 126, 234, 0.05)',
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  {fileList.map((file, index) => (
                    <div key={file.uid || index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: index < fileList.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <InboxOutlined style={{ color: '#667eea', marginRight: '8px' }} />
                        <span style={{ color: '#2c3e50' }}>{file.name}</span>
                        {file.status === 'done' && (
                          <span style={{
                            color: '#52c41a',
                            marginLeft: '8px',
                            fontSize: '12px'
                          }}>
                            ✓ 已上传
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Form.Item
              name="documents"
              label={<span style={{ fontWeight: 600, color: '#2c3e50' }}>
                {fileList.length > 0 ? '继续上传更多文档' : '上传资质文档'}
              </span>}
            >
              <Dragger
                {...uploadProps}
                style={{
                  borderRadius: '12px',
                  border: '2px dashed #667eea',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))'
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#667eea', fontSize: '48px' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 500, color: '#2c3e50' }}>
                  点击或拖拽文件到此区域上传
                </p>
                <p className="ant-upload-hint" style={{ color: '#666', fontSize: '14px' }}>
                  支持单个或批量上传。支持 PDF、Word、Excel、EPUB、文本、图片等格式，单个文件不超过 100MB
                </p>
              </Dragger>
            </Form.Item>
          </Card>

          {/* 第三步操作按钮 */}
          <div className="modern-card" style={{
            textAlign: 'center',
            marginTop: 32,
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.8)'
          }}>
            {currentStep > 0 && (
              <Button
                size="large"
                style={{
                  marginRight: 16,
                  borderRadius: '8px',
                  height: '48px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  fontWeight: 500
                }}
                onClick={prevStep}
              >
                上一步
              </Button>
            )}

            {currentStep === steps.length - 1 && (
              <>
                <Button
                  icon={<SaveOutlined />}
                  size="large"
                  style={{
                    marginRight: 16,
                    borderRadius: '8px',
                    height: '48px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    fontWeight: 500
                  }}
                  onClick={handleSaveDraft}
                >
                  保存草稿
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                  size="large"
                  className="gradient-button"
                  style={{
                    height: '48px',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    fontWeight: 500,
                    fontSize: '16px'
                  }}
                >
                  提交申请
                </Button>
              </>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
};

export default DynamicForm;
