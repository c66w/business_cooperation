/**
 * 文档处理服务
 * 与Python微服务集成，提供文档上传、解析、LLM分析功能
 */

const axios = require('axios');
const multer = require('multer');
const path = require('path');

class DocumentService {
  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];

    console.log('📄 DocumentService 初始化完成，Python服务地址:', this.pythonServiceUrl);
  }

  /**
   * 配置multer中间件
   */
  getUploadMiddleware() {
    const storage = multer.memoryStorage();
    
    return multer({
      storage: storage,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        // 修复文件名编码问题
        try {
          file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch (error) {
          console.warn('文件名编码转换失败:', error);
        }

        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        if (this.allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`不支持的文件类型: ${ext}`), false);
        }
      }
    });
  }

  /**
   * 上传文档 - 通过Python服务处理
   */
  async uploadDocument(file, userId, applicationId = null) {
    try {
      console.log(`📤 开始上传文档: ${file.originalname}, 用户: ${userId}`);

      // 创建FormData发送到Python服务
      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('user_id', userId);
      if (applicationId) {
        formData.append('application_id', applicationId);
      }

      // 尝试调用Python服务上传
      try {
        const uploadUrl = `${this.pythonServiceUrl}/api/document/upload`;
        console.log(`🔗 调用Python服务URL: ${uploadUrl}`);
        console.log(`📦 FormData headers:`, formData.getHeaders());

        const response = await axios.post(
          uploadUrl,
          formData,
          {
            headers: {
              ...formData.getHeaders()
            },
            timeout: 60000 // 60秒超时
          }
        );

        if (response.data.success) {
          const uploadData = response.data.data;
          console.log(`✅ Python服务上传成功: ${uploadData.oss_url}`);
          console.log(`🔍 Python服务返回的完整数据:`, JSON.stringify(uploadData, null, 2));

          // 确保oss_key存在，如果不存在则从oss_url提取
          let ossKey = uploadData.oss_key;
          if (!ossKey && uploadData.oss_url) {
            // 从URL中提取key（去掉域名部分）
            const url = new URL(uploadData.oss_url);
            ossKey = url.pathname.substring(1); // 去掉开头的 /
            console.log(`🔧 从URL提取oss_key: ${ossKey}`);
          }

          // 保存文档记录到本地数据库
          const documentRecord = await this.saveDocumentRecord({
            user_id: userId,
            application_id: applicationId,
            file_name: file.originalname,
            original_name: file.originalname,
            file_size: file.size,
            file_type: path.extname(file.originalname).slice(1).toLowerCase(),
            mime_type: file.mimetype,
            oss_url: uploadData.oss_url,
            oss_key: ossKey,
            status: 'uploaded'
          });

          console.log('📄 文档记录保存成功，document_id:', documentRecord.id);

          return {
            success: true,
            data: {
              document_id: documentRecord.id,
              oss_url: uploadData.oss_url,
              oss_key: uploadData.oss_key,
              file_name: file.originalname,
              file_size: file.size
            }
          };
        } else {
          throw new Error(response.data.message || 'Python服务上传失败');
        }
      } catch (pythonError) {
        console.error(`❌ Python服务调用失败: ${pythonError.message}`);
        throw new Error(`文档上传失败: Python服务不可用 - ${pythonError.message}`);
      }

    } catch (error) {
      console.error('文档上传失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 异步解析文档
   */
  async parseDocumentAsync(documentId, ossUrl) {
    try {
      console.log(`🔍 开始异步解析文档: ${documentId}`);

      // 尝试调用Python服务解析
      const response = await axios.post(
        `${this.pythonServiceUrl}/api/parsing/parse`,
        {
          document_id: documentId,
          oss_url: ossUrl
        },
        {
          timeout: 60000 // 60秒超时
        }
      );

      if (response.data.success) {
        console.log(`✅ 文档解析成功: ${documentId}`);
      } else {
        console.warn(`⚠️ 文档解析失败: ${response.data.message}`);
      }

    } catch (error) {
      console.warn(`⚠️ 文档解析异常: ${error.message}`);
    }
  }

  /**
   * 解析文档
   */
  async parseDocument(documentId) {
    try {
      console.log(`🔍 开始解析文档，documentId: ${documentId}`);

      const response = await axios.post(
        `${this.pythonServiceUrl}/api/parsing/parse`,
        {
          document_id: documentId
        },
        {
          timeout: 300000 // 5分钟超时
        }
      );

      if (response.data.success) {
        // 更新本地数据库中的解析状态
        await this.updateDocumentStatus(documentId, 'parsed');
        
        // 保存解析结果
        console.log(`💾 保存解析结果，documentId: ${documentId}`);
        console.log(`💾 documentId类型: ${typeof documentId}`);
        console.log(`💾 documentId值: ${JSON.stringify(documentId)}`);

        await this.saveParsingResult({
          document_id: documentId,
          parsed_content: response.data.data.parsed_content,
          structured_content: JSON.stringify(response.data.data.structured_content),
          parsing_status: 'completed'
        });

        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || '解析失败');
      }

    } catch (error) {
      console.error('文档解析失败:', error);
      await this.updateDocumentStatus(documentId, 'failed', error.message);
      throw new Error(`文档解析失败: ${error.message}`);
    }
  }

  /**
   * LLM智能分析
   */
  async analyzeWithLLM(documentId, merchantType) {
    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/api/llm/analyze`,
        {
          document_id: documentId,
          merchant_type: merchantType
        },
        {
          timeout: 120000 // 2分钟超时
        }
      );

      if (response.data.success) {
        // 保存LLM分析结果
        await this.saveLLMResult({
          document_id: documentId,
          llm_suggestions: JSON.stringify(response.data.data.suggestions),
          confidence_score: response.data.data.overall_confidence,
          llm_model: response.data.data.model_used,
          processing_duration: Math.round(response.data.data.processing_time)
        });

        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'LLM分析失败');
      }

    } catch (error) {
      console.error('LLM分析失败:', error);
      throw new Error(`LLM分析失败: ${error.message}`);
    }
  }

  /**
   * 获取用户文档列表
   */
  async getUserDocuments(userId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      const documents = await execute(`
        SELECT 
          du.*,
          dpr.parsing_status,
          dpr.confidence_score,
          dpr.llm_model
        FROM document_uploads du
        LEFT JOIN document_parsing_results dpr ON du.id = dpr.document_id
        WHERE du.user_id = ?
        ORDER BY du.upload_time DESC
      `, [userId]);

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      console.error('获取文档列表失败:', error);
      throw new Error(`获取文档列表失败: ${error.message}`);
    }
  }

  /**
   * 获取文档的LLM建议
   */
  async getDocumentSuggestions(documentId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      const [result] = await execute(`
        SELECT llm_suggestions, confidence_score
        FROM document_parsing_results
        WHERE document_id = ? AND parsing_status = 'completed'
      `, [documentId]);

      if (result && result.llm_suggestions) {
        const suggestions = JSON.parse(result.llm_suggestions);
        return {
          success: true,
          data: {
            document_id: documentId,
            suggestions: suggestions,
            overall_confidence: result.confidence_score
          }
        };
      } else {
        return {
          success: false,
          message: '未找到LLM分析结果'
        };
      }

    } catch (error) {
      console.error('获取LLM建议失败:', error);
      throw new Error(`获取LLM建议失败: ${error.message}`);
    }
  }

  /**
   * 保存文档记录到数据库
   */
  async saveDocumentRecord(documentData) {
    const { execute } = require('../config/database-sqlite');

    console.log('💾 保存文档记录:', documentData);

    const result = await execute(`
      INSERT INTO document_uploads (
        user_id, application_id, file_name, original_name, file_size,
        file_type, mime_type, oss_url, oss_key, status, upload_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      documentData.user_id,
      documentData.application_id,
      documentData.file_name,
      documentData.original_name,
      documentData.file_size,
      documentData.file_type,
      documentData.mime_type,
      documentData.oss_url,
      documentData.oss_key,
      documentData.status
    ]);

    console.log('💾 文档记录保存结果:', result);

    // SQLite execute返回的是数组，第一个元素包含insertId
    const insertResult = Array.isArray(result) ? result[0] : result;
    const documentId = insertResult.insertId || insertResult.lastID || Date.now();
    console.log('📄 生成的文档ID:', documentId);

    return { id: documentId };
  }

  /**
   * 更新文档状态
   */
  async updateDocumentStatus(documentId, status, errorMessage = null) {
    const { execute } = require('../config/database-sqlite');
    
    await execute(`
      UPDATE document_uploads 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, errorMessage, documentId]);
  }

  /**
   * 保存解析结果
   */
  async saveParsingResult(parsingData) {
    const { execute } = require('../config/database-sqlite');
    
    await execute(`
      INSERT OR REPLACE INTO document_parsing_results (
        document_id, parsed_content, extracted_fields, parsing_status, parsing_time
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      parsingData.document_id,
      parsingData.parsed_content,
      parsingData.structured_content,
      parsingData.parsing_status
    ]);
  }

  /**
   * 保存LLM分析结果
   */
  async saveLLMResult(llmData) {
    const { execute } = require('../config/database-sqlite');
    
    await execute(`
      UPDATE document_parsing_results 
      SET 
        llm_suggestions = ?,
        confidence_score = ?,
        llm_model = ?,
        processing_duration = ?
      WHERE document_id = ?
    `, [
      llmData.llm_suggestions,
      llmData.confidence_score,
      llmData.llm_model,
      llmData.processing_duration,
      llmData.document_id
    ]);
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId) {
    try {
      console.log(`🗑️ 开始删除文档，documentId: ${documentId}`);

      // 首先从数据库获取文档信息
      const { execute } = require('../config/database-sqlite');
      const selectSql = `
        SELECT id, oss_key, oss_url, file_name, original_name
        FROM document_uploads
        WHERE id = ?
      `;

      const documents = await execute(selectSql, [documentId]);

      if (documents.length === 0) {
        return {
          success: false,
          message: '文档不存在'
        };
      }

      const document = documents[0];
      console.log(`📄 找到文档记录:`, document);

      // 通过Python服务删除OSS文件
      let ossDeleted = false;
      if (document.oss_key) {
        try {
          const response = await axios.delete(
            `${this.pythonServiceUrl}/api/document/delete-by-key`,
            {
              params: { oss_key: document.oss_key },
              timeout: 30000
            }
          );

          if (response.data.success) {
            ossDeleted = response.data.data.oss_deleted;
            console.log(`🗑️ OSS文件删除结果: ${ossDeleted}`);
          }
        } catch (error) {
          console.warn(`⚠️ OSS文件删除失败，继续删除数据库记录: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ 文档没有OSS键，跳过OSS删除`);
      }

      // 删除相关的解析结果（如果表存在）
      try {
        const deleteParsingResultSql = `DELETE FROM document_parsing_results WHERE document_id = ?`;
        await execute(deleteParsingResultSql, [documentId]);
        console.log(`✅ 删除解析结果成功: ${documentId}`);
      } catch (error) {
        console.warn(`⚠️ 删除解析结果失败（可能表不存在）: ${error.message}`);
      }

      // 删除相关的LLM分析结果（如果表存在）
      try {
        const deleteLLMResultSql = `DELETE FROM document_llm_analysis WHERE document_id = ?`;
        await execute(deleteLLMResultSql, [documentId]);
        console.log(`✅ 删除LLM分析结果成功: ${documentId}`);
      } catch (error) {
        console.warn(`⚠️ 删除LLM分析结果失败（可能表不存在）: ${error.message}`);
      }

      // 删除主文档记录
      const deleteSql = `DELETE FROM document_uploads WHERE id = ?`;
      await execute(deleteSql, [documentId]);

      console.log(`✅ 文档删除成功: ${documentId}`);

      return {
        success: true,
        data: {
          document_id: documentId,
          file_name: document.original_name,
          oss_deleted: ossDeleted,
          database_deleted: true
        }
      };

    } catch (error) {
      console.error('文档删除失败:', error);
      return {
        success: false,
        message: `文档删除失败: ${error.message}`
      };
    }
  }

  /**
   * 获取文档信息
   */
  async getDocumentInfo(documentId) {
    try {
      console.log(`📋 获取文档信息，documentId: ${documentId}`);

      const { execute } = require('../config/database-sqlite');
      const sql = `
        SELECT d.*,
               pr.parsed_content, pr.parsing_status,
               la.llm_suggestions, la.confidence_score, la.llm_model
        FROM document_uploads d
        LEFT JOIN document_parsing_results pr ON d.id = pr.document_id
        LEFT JOIN document_llm_analysis la ON d.id = la.document_id
        WHERE d.id = ?
      `;

      const results = await execute(sql, [documentId]);

      if (results.length === 0) {
        return {
          success: false,
          message: '文档不存在'
        };
      }

      const document = results[0];

      // 尝试获取OSS文件信息
      let ossInfo = null;
      try {
        const response = await axios.get(
          `${this.pythonServiceUrl}/api/document/info/${documentId}`,
          {
            timeout: 10000
          }
        );

        if (response.data.success) {
          ossInfo = response.data.data.oss_info;
        }
      } catch (error) {
        console.warn(`⚠️ 获取OSS文件信息失败: ${error.message}`);
      }

      return {
        success: true,
        data: {
          document: {
            id: document.id,
            file_name: document.file_name,
            original_name: document.original_name,
            file_size: document.file_size,
            file_type: document.file_type,
            mime_type: document.mime_type,
            oss_url: document.oss_url,
            oss_key: document.oss_key,
            status: document.status,
            created_at: document.created_at
          },
          parsing: {
            parsed_content: document.parsed_content,
            parsing_status: document.parsing_status
          },
          llm_analysis: {
            suggestions: document.llm_suggestions ? JSON.parse(document.llm_suggestions) : null,
            confidence_score: document.confidence_score,
            llm_model: document.llm_model
          },
          oss_info: ossInfo
        }
      };

    } catch (error) {
      console.error('获取文档信息失败:', error);
      return {
        success: false,
        message: `获取文档信息失败: ${error.message}`
      };
    }
  }
}

module.exports = DocumentService;
