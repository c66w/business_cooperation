/**
 * 文档解析路由 - 替换Python后端
 */

const express = require('express');
const multer = require('multer');
const DocumentExtractService = require('../services/DocumentExtractService');
const LLMService = require('../services/LLMService');
const router = express.Router();

// 配置multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 初始化服务
const documentExtractService = new DocumentExtractService();
const llmService = new LLMService();

/**
 * 健康检查
 */
router.get('/health', async (req, res) => {
  try {
    const ossStatus = 'connected'; // 简化状态检查
    const llmStatus = await llmService.checkStatus();
    
    res.json({
      status: 'healthy',
      services: {
        oss: ossStatus,
        llm: llmStatus.status,
        parsing: 'unstructured',
        model: 'local-services'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * 文档提取API - 兼容原Python接口
 */
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    console.log(`📄 开始解析文档: ${req.file.originalname}`);

    // 保存临时文件
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      // 使用文档解析服务
      const result = await documentExtractService.extractDocument(tempFilePath, req.file.originalname);
      
      // 清理临时文件
      fs.unlinkSync(tempFilePath);
      
      res.json(result);

    } catch (extractError) {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw extractError;
    }

  } catch (error) {
    console.error('文档解析失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * LLM分析API
 */
router.post('/analyze', async (req, res) => {
  try {
    const { document_content, merchant_type = 'factory' } = req.body;

    if (!document_content) {
      return res.status(400).json({
        success: false,
        message: '缺少文档内容'
      });
    }

    console.log(`🤖 开始LLM分析，商家类型: ${merchant_type}`);

    const result = await llmService.analyzeDocument(document_content, merchant_type);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('LLM分析失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 商家类型推荐API
 */
router.post('/recommend-type', async (req, res) => {
  try {
    const { document_content } = req.body;

    if (!document_content) {
      return res.status(400).json({
        success: false,
        message: '缺少文档内容'
      });
    }

    const result = await llmService.recommendMerchantType(document_content);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('商家类型推荐失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 智能填充表单API
 */
router.post('/smart-fill', async (req, res) => {
  try {
    const { document_content, form_fields } = req.body;

    if (!document_content || !form_fields) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    const result = await llmService.smartFillForm(document_content, form_fields);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('智能填充失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 文档摘要API
 */
router.post('/summary', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 保存临时文件
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      // 获取文档摘要
      const result = await documentExtractService.getDocumentSummary(tempFilePath, req.file.originalname);
      
      // 清理临时文件
      fs.unlinkSync(tempFilePath);
      
      res.json({
        success: true,
        data: result
      });

    } catch (extractError) {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw extractError;
    }

  } catch (error) {
    console.error('文档摘要失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
