/**
 * 文档处理服务
 * 集成文档解析和OSS存储功能
 */

const path = require('path');
const multer = require('multer');
const { getDocumentExtractService } = require('./DocumentExtractService');
const { OSSService } = require('./OSSService');

class DocumentService {
  constructor() {
    this.documentExtractService = getDocumentExtractService();
    this.ossService = new OSSService();
    this.maxFileSize = 100 * 1024 * 1024; // 50MB
    this.allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg'];

    console.log('📄 DocumentService 初始化完成，使用本地服务');
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
   * 上传文档 - 使用本地服务处理
   */
  async uploadDocument(file, userId, applicationId = null) {
    try {
      console.log(`📤 开始上传文档: ${file.originalname}, 用户: ${userId}`);

      // 生成OSS文件键
      const fileKey = this.ossService.generateFileKey(userId, file.originalname);

      // 上传到OSS
      const uploadResult = await this.ossService.uploadFile(
        file.buffer,
        fileKey,
        file.mimetype
      );

      if (!uploadResult.success) {
        throw new Error(`OSS上传失败: ${uploadResult.error}`);
      }

      // 保存文档记录到本地数据库
      const documentRecord = await this.saveDocumentRecord({
        user_id: userId,
        application_id: applicationId,  // 允许为 null
        file_name: file.originalname,
        original_name: file.originalname,
        file_size: file.size,
        file_type: path.extname(file.originalname).slice(1).toLowerCase(),
        mime_type: file.mimetype,
        oss_url: uploadResult.oss_url,
        oss_key: uploadResult.oss_key,
        status: 'uploaded'
      });

      console.log('📄 文档记录保存成功，document_id:', documentRecord.id);

      return {
        success: true,
        data: {
          document_id: documentRecord.id,
          oss_url: uploadResult.oss_url,
          oss_key: uploadResult.oss_key,
          file_name: file.originalname,
          file_size: file.size
        }
      };

    } catch (error) {
      console.error('文档上传失败:', error);
      return {
        success: false,
        message: error.message
      };
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

      // 通过本地OSS服务删除文件
      let ossDeleted = false;
      if (document.oss_key) {
        try {
          const deleteResult = await this.ossService.deleteFile(document.oss_key);
          ossDeleted = deleteResult.success;
          console.log(`🗑️ OSS文件删除结果: ${ossDeleted}`);
        } catch (error) {
          console.warn(`⚠️ OSS文件删除失败，继续删除数据库记录: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ 文档没有OSS键，跳过OSS删除`);
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
   * 解析文档
   */
  async parseDocument(documentId) {
    try {
      console.log(`🔍 开始解析文档，documentId: ${documentId}`);

      // 获取文档信息
      const documentInfo = await this.getDocumentInfo(documentId);
      if (!documentInfo.success) {
        throw new Error('文档不存在');
      }

      const document = documentInfo.data;

      // 从OSS下载文件数据
      const fileData = await this.ossService.downloadFile(document.oss_key);

      // 使用新的文档解析服务
      const extractResult = await this.documentExtractService.extractFromBytes(fileData, document.original_name);

      // 保存解析结果到数据库
      await this.saveParsingResult(documentId, extractResult);

      // 更新文档状态
      await this.updateDocumentStatus(documentId, 'parsed');

      console.log(`✅ 文档解析完成: ${documentId}`);

      return {
        success: true,
        data: extractResult
      };

    } catch (error) {
      console.error('文档解析失败:', error);
      await this.updateDocumentStatus(documentId, 'failed', error.message);
      throw new Error(`文档解析失败: ${error.message}`);
    }
  }

  /**
   * 批量更新用户文档的申请关联
   */
  async updateUserDocumentsApplication(userId, applicationId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      console.log(`🔄 批量更新用户 ${userId} 的文档关联到申请 ${applicationId}`);
      
      const result = await execute(`
        UPDATE document_uploads 
        SET application_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND application_id IS NULL
      `, [applicationId, userId]);

      console.log(`✅ 批量更新完成，影响 ${result.changes || 0} 条记录`);
      
      return {
        success: true,
        data: { updatedCount: result.changes || 0 }
      };

    } catch (error) {
      console.error('批量更新文档关联失败:', error);
      throw new Error(`批量更新文档关联失败: ${error.message}`);
    }
  }

  /**
   * 获取用户未关联的文档
   */
  async getUnassociatedDocuments(userId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      const documents = await execute(`
        SELECT 
          du.*
        FROM document_uploads du
        WHERE du.user_id = ? AND du.application_id IS NULL
        ORDER BY du.upload_time DESC
      `, [userId]);

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      console.error('获取未关联文档失败:', error);
      throw new Error(`获取未关联文档失败: ${error.message}`);
    }
  }

  /**
   * 获取用户的所有文档
   */
  async getUserDocuments(userId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      const documents = await execute(`
        SELECT 
          du.*
        FROM document_uploads du
        WHERE du.user_id = ?
        ORDER BY du.upload_time DESC
      `, [userId]);

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      console.error('获取用户文档失败:', error);
      throw new Error(`获取用户文档失败: ${error.message}`);
    }
  }

  /**
   * 获取申请文档列表
   */
  async getApplicationDocuments(applicationId) {
    try {
      const { execute } = require('../config/database-sqlite');
      
      const documents = await execute(`
        SELECT 
          du.id as file_id,
          du.original_name as file_name,
          du.oss_url as file_url,
          du.file_type,
          du.upload_time,
          du.user_id
        FROM document_uploads du
        WHERE du.application_id = ?
        ORDER BY du.upload_time DESC
      `, [applicationId]);

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



  /**
   * 保存解析结果
   */
  async saveParsingResult(documentId, extractResult) {
    try {
      const { execute } = require('../config/database-sqlite');

      await execute(`
        INSERT INTO document_parsing_results
        (document_id, parsed_content, parsing_status, confidence_score, llm_model, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        documentId,
        JSON.stringify(extractResult),
        'completed',
        0.9,
        'unstructured'
      ]);

      console.log(`✅ 解析结果保存成功: ${documentId}`);
    } catch (error) {
      console.error('保存解析结果失败:', error);
      throw error;
    }
  }
}

module.exports = DocumentService;
