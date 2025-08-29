/**
 * 文档处理路由
 * 提供文档上传、解析、LLM分析等功能
 */

const express = require('express');
const DocumentService = require('../services/DocumentService');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const documentService = new DocumentService();
const upload = documentService.getUploadMiddleware();

/**
 * 上传文档
 */
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { user } = req;
    const { application_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    console.log(`📄 用户 ${user.userId} 上传文档: ${file.originalname}`);

    // 上传文档
    const result = await documentService.uploadDocument(file, user.userId, application_id);

    if (result.success) {
      console.log(`✅ 文档上传成功: ${file.originalname}`);
      res.json({
        success: true,
        message: '文档上传成功',
        data: result.data
      });
    } else {
      throw new Error(result.message || '上传失败');
    }

  } catch (error) {
    console.error('文档上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文档上传失败',
      error: error.message
    });
  }
});

/**
 * 解析文档
 */
router.post('/parse/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { user } = req;

    console.log(`🔍 用户 ${user.userId} 请求解析文档: ${documentId}`);

    // 解析文档
    const result = await documentService.parseDocument(parseInt(documentId));

    if (result.success) {
      console.log(`✅ 文档解析成功: ${documentId}`);
      res.json({
        success: true,
        message: '文档解析成功',
        data: result.data
      });
    } else {
      throw new Error(result.message || '解析失败');
    }

  } catch (error) {
    console.error('文档解析失败:', error);
    res.status(500).json({
      success: false,
      message: '文档解析失败',
      error: error.message
    });
  }
});

/**
 * 获取用户文档列表
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { user } = req;

    console.log(`📋 用户 ${user.userId} 请求文档列表`);

    const result = await documentService.getUserDocuments(user.userId);

    if (result.success) {
      console.log(`✅ 获取文档列表成功: ${result.data.length} 个文档`);
      res.json({
        success: true,
        message: '获取文档列表成功',
        data: result.data
      });
    } else {
      throw new Error(result.message || '获取失败');
    }

  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文档列表失败',
      error: error.message
    });
  }
});

/**
 * 删除文档
 */
router.delete('/delete/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { user } = req;

    console.log(`🗑️ 用户 ${user.userId} 请求删除文档: ${documentId}`);

    // 删除文档
    const result = await documentService.deleteDocument(parseInt(documentId));

    if (result.success) {
      console.log(`✅ 文档删除成功: ${documentId}`);
      res.json({
        success: true,
        message: '文档删除成功',
        data: result.data
      });
    } else {
      throw new Error(result.message || '删除失败');
    }

  } catch (error) {
    console.error('文档删除失败:', error);
    res.status(500).json({
      success: false,
      message: '文档删除失败',
      error: error.message
    });
  }
});

/**
 * 获取文档信息
 */
router.get('/info/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { user } = req;

    console.log(`📋 用户 ${user.userId} 请求文档信息: ${documentId}`);

    // 获取文档信息
    const result = await documentService.getDocumentInfo(parseInt(documentId));

    if (result.success) {
      console.log(`✅ 获取文档信息成功: ${documentId}`);
      res.json({
        success: true,
        message: '获取文档信息成功',
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || '文档不存在'
      });
    }

  } catch (error) {
    console.error('获取文档信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文档信息失败',
      error: error.message
    });
  }
});

/**
 * 测试本地服务连接
 */
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 用户 ${req.user.userId} 请求测试本地服务连接`);

    // 测试本地服务状态
    const LLMService = require('../services/LLMService');
    const OSSService = require('../services/OSSService');

    const llmService = new LLMService();
    const ossService = new OSSService();

    const llmStatus = await llmService.checkStatus();
    const ossStatus = await ossService.checkStatus();

    console.log(`✅ 本地服务连接测试完成`);
    res.json({
      success: true,
      message: '本地服务连接测试成功',
      data: {
        llm: llmStatus,
        oss: ossStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('本地服务连接测试失败:', error);
    res.status(500).json({
      success: false,
      message: '本地服务连接测试失败',
      error: error.message
    });
  }
});

module.exports = router;
