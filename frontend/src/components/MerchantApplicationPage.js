import React, { useState } from 'react';
import { Layout, Card, Result, Button, message, Row, Col, Divider } from 'antd';
import { CheckCircleOutlined, HomeOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DynamicForm from './DynamicForm';
import DocumentUpload from './DocumentUpload';

import axios from 'axios';

const { Header, Content } = Layout;

// 商家类型显示名称
const getTypeDisplayName = (type) => {
  const typeMap = {
    'factory': '🏭 生产工厂',
    'brand': '🏷️ 品牌商',
    'agent': '🤝 代理商',
    'dealer': '📦 经销商',
    'operator': '🔧 代运营商'
  };
  return typeMap[type] || type;
};

const MerchantApplicationPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [selectedMerchantType, setSelectedMerchantType] = useState('');
  const [formRef, setFormRef] = useState(null);
  const [sharedFileList, setSharedFileList] = useState([]); // 共享的文件列表



  /**
   * 处理文档上传完成
   */
  const handleDocumentUploaded = (uploadedFiles) => {
    console.log('文档上传完成:', uploadedFiles);
    // 将上传的文件添加到共享文件列表
    const newFiles = uploadedFiles.map(file => ({
      uid: file.id || `${Date.now()}-${Math.random()}`,
      name: file.original_name || file.file_name,
      status: 'done',
      url: file.oss_url,
      response: file,
      originFileObj: null // 已上传的文件没有原始文件对象
    }));

    setSharedFileList(prev => [...prev, ...newFiles]);
    message.success(`成功上传 ${uploadedFiles.length} 个文件`);
  };

  /**
   * 处理智能分析请求
   */
  const handleRequestSmartFill = async (stage) => {
    try {
      if (sharedFileList.length === 0) {
        message.warning('请先上传文档再进行智能分析');
        return;
      }

      message.loading(`正在进行${stage === 'basic' ? '基础信息' : '详细信息'}智能分析...`, 0);

      // 准备请求数据
      const requestData = {
        documents: sharedFileList.map(file => ({
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        })),
        currentData: formRef?.getFieldsValue() || {},
        merchantType: selectedMerchantType
      };

      // 调用对应阶段的LLM分析接口
      const apiEndpoint = stage === 'basic'
        ? '/api/llm/analyze/basic'
        : '/api/llm/analyze/detailed';

      console.log(`调用${stage}阶段LLM分析接口:`, apiEndpoint, requestData);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      message.destroy();

      if (result.success) {
        // 合并新的建议到现有建议中
        const newSuggestions = result.data.suggestions.map(s => ({
          ...s,
          stage: stage
        }));

        setSmartSuggestions(prev => {
          // 移除同一阶段的旧建议，添加新建议
          const filteredPrev = prev.filter(s => s.stage !== stage);
          return [...filteredPrev, ...newSuggestions];
        });

        console.log(`${stage}阶段分析完成:`, {
          suggestions: newSuggestions,
          modelVersion: result.data.model_version,
          analysisTime: result.data.analysis_time
        });

        message.success(`${stage === 'basic' ? '基础信息' : '详细信息'}智能分析完成，获得 ${newSuggestions.length} 个建议`);
      } else {
        throw new Error(result.message || '智能分析失败');
      }
    } catch (error) {
      message.destroy();
      console.error('智能分析失败:', error);
      message.error(`智能分析失败：${error.message}`);
    }
  };

  /**
   * 处理商家类型变化
   */
  const handleMerchantTypeChange = (merchantType) => {
    setSelectedMerchantType(merchantType);
  };

  /**
   * 处理表单引用
   */
  const handleFormRef = (form) => {
    setFormRef(form);
  };

  /**
   * 处理表单提交
   */
  const handleFormSubmit = async (formData) => {
    try {
      console.log('📤 MerchantApplicationPage: 开始提交申请...', formData);

      // 发送表单数据到后端
      const response = await axios.post('/api/merchant/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30秒超时
      });

      if (response.data.success) {
        setSubmissionResult({
          success: true,
          userId: response.data.data.userId,
          message: response.data.message,
          workflowId: response.data.data.workflowId
        });
        setSubmitted(true);
        
        // 显示成功消息
        message.success('申请提交成功！我们将在72小时内完成审核。');
      } else {
        throw new Error(response.data.message || '提交失败');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      let errorMessage = '提交失败，请重试';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
      throw error; // 重新抛出错误，让表单组件处理
    }
  };

  /**
   * 重新申请
   */
  const handleReapply = () => {
    setSubmitted(false);
    setSubmissionResult(null);
  };

  if (submitted && submissionResult?.success) {
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
            商家合作申请
          </h1>
        </Header>
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="modern-card" style={{
              padding: '60px 40px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(102, 126, 234, 0.1))'
            }}>
              <Result
                icon={<CheckCircleOutlined style={{
                  color: '#52c41a',
                  fontSize: '80px',
                  marginBottom: '24px'
                }} />}
                title={
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#2c3e50',
                    marginBottom: '16px'
                  }}>
                    申请提交成功！
                  </h1>
                }
                subTitle={
                  <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#666' }}>
                    <p style={{ marginBottom: '12px' }}>
                      您的申请已成功提交，申请编号：
                      <span style={{
                        color: '#667eea',
                        fontWeight: 600,
                        background: 'rgba(102, 126, 234, 0.1)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        marginLeft: '8px'
                      }}>
                        {submissionResult.userId}
                      </span>
                    </p>
                    <p style={{ marginBottom: '12px' }}>
                      我们将在 <strong style={{ color: '#52c41a' }}>72小时</strong> 内完成审核，请保持联系方式畅通。
                    </p>
                    <p style={{ marginBottom: 0 }}>
                      审核结果将通过邮件和短信通知您。
                    </p>
                  </div>
                }
              extra={
                <div style={{ marginTop: '32px' }}>
                  <Button
                    type="primary"
                    key="home"
                    icon={<HomeOutlined />}
                    onClick={() => navigate('/')}
                    size="large"
                    className="gradient-button"
                    style={{
                      marginRight: '16px',
                      height: '48px',
                      paddingLeft: '32px',
                      paddingRight: '32px',
                      fontWeight: 500,
                      fontSize: '16px'
                    }}
                  >
                    返回首页
                  </Button>
                  <Button
                    key="reapply"
                    onClick={handleReapply}
                    size="large"
                    style={{
                      height: '48px',
                      paddingLeft: '32px',
                      paddingRight: '32px',
                      fontWeight: 500,
                      fontSize: '16px',
                      borderRadius: '8px'
                    }}
                  >
                    提交新申请
                  </Button>
                </div>
              }
            />
            </div>

            <div className="modern-card" style={{ marginTop: 32, padding: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <div style={{
                  width: '6px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '3px',
                  marginRight: '12px'
                }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2c3e50'
                }}>
                  后续流程
                </h3>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <strong style={{ color: '#667eea', fontSize: '16px' }}>1. 自动验证（即时完成）</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#666', lineHeight: '1.6' }}>
                    系统将自动验证您提交的信息格式和完整性
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.05), rgba(102, 126, 234, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(250, 173, 20, 0.1)'
                }}>
                  <strong style={{ color: '#faad14', fontSize: '16px' }}>2. 人工审核（1-3个工作日）</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#666', lineHeight: '1.6' }}>
                    我们的行业运营专员将详细审核您的申请材料
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.05), rgba(102, 126, 234, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(82, 196, 26, 0.1)'
                }}>
                  <strong style={{ color: '#52c41a', fontSize: '16px' }}>3. 审核结果通知</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#666', lineHeight: '1.6' }}>
                    审核完成后，我们将通过邮件和短信通知您结果
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(245, 34, 45, 0.05), rgba(102, 126, 234, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 34, 45, 0.1)'
                }}>
                  <strong style={{ color: '#f5222d', fontSize: '16px' }}>4. 商务洽谈</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#666', lineHeight: '1.6' }}>
                    审核通过后，我们的商务人员将在24小时内与您联系
                  </p>
                </div>
              </div>
            </div>

            <div className="modern-card" style={{
              marginTop: 24,
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <div style={{
                  width: '6px',
                  height: '24px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '3px',
                  marginRight: '12px'
                }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2c3e50'
                }}>
                  联系我们
                </h3>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ color: '#667eea', minWidth: '100px' }}>客服热线：</strong>
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>400-xxx-xxxx</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ color: '#667eea', minWidth: '100px' }}>工作时间：</strong>
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>周一至周五 9:00-18:00</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ color: '#667eea', minWidth: '100px' }}>客服邮箱：</strong>
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>cooperation@ywwl.com</span>
                </div>
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '15px', lineHeight: '1.6' }}>
                    如有任何疑问，请随时联系我们的客服团队。
                  </p>
                </div>
              </div>
            </div>
          </div>
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
          商家合作申请
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
              智能商家合作申请
            </h1>
            <p style={{
              color: '#666',
              fontSize: '18px',
              marginBottom: 0,
              fontWeight: 500
            }}>
              🚀 支持文档智能解析，一键自动填写表单，让申请更简单高效
            </p>
          </div>

          <Row gutter={[32, 24]}>
            {/* 左侧：文档上传 */}
            <Col xs={24} lg={8}>
              <div style={{ position: 'sticky', top: '24px' }}>
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
                      📎 文档上传
                    </h2>
                  </div>

                  <div style={{
                    marginBottom: 24,
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                    borderRadius: '12px',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <p style={{
                      color: '#666',
                      marginBottom: 0,
                      fontSize: '15px',
                      lineHeight: '1.6'
                    }}>
                      请上传相关资质文档，系统将在表单填写过程中提供智能分析和填写建议。
                    </p>
                  </div>

                  <DocumentUpload
                    onDocumentUploaded={handleDocumentUploaded}
                    sharedFileList={sharedFileList}
                  />
                </div>
              </div>
            </Col>

            {/* 右侧：申请表单 */}
            <Col xs={24} lg={16}>
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
                    📝 商家信息申请
                  </h2>
                </div>

                <div style={{
                  marginBottom: 24,
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <p style={{
                    color: '#666',
                    marginBottom: 0,
                    fontSize: '15px',
                    lineHeight: '1.6'
                  }}>
                    请根据您的商家类型填写相应信息，我们将在72小时内完成审核。
                    您也可以上传相关文档，系统将智能提取信息帮您快速填写。
                  </p>
                </div>

                <DynamicForm
                  onSubmit={handleFormSubmit}
                  onMerchantTypeChange={handleMerchantTypeChange}
                  onFormRef={handleFormRef}
                  initialFileList={sharedFileList}
                  onFileListChange={setSharedFileList}
                  smartSuggestions={smartSuggestions}
                  onRequestSmartFill={handleRequestSmartFill}
                />
              </div>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default MerchantApplicationPage;
