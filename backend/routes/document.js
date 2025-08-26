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
 * LLM智能分析 - 单个文档
 */
router.post('/analyze/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { merchant_type } = req.body;
    const { user } = req;

    if (!merchant_type) {
      return res.status(400).json({
        success: false,
        message: '请指定商家类型'
      });
    }

    console.log(`🤖 用户 ${user.userId} 请求LLM分析文档: ${documentId}, 类型: ${merchant_type}`);

    // LLM分析
    const result = await documentService.analyzeWithLLM(parseInt(documentId), merchant_type);

    if (result.success) {
      console.log(`✅ LLM分析成功: ${documentId}, 建议数量: ${result.data.suggestions.length}`);
      res.json({
        success: true,
        message: 'LLM分析成功',
        data: result.data
      });
    } else {
      throw new Error(result.message || 'LLM分析失败');
    }

  } catch (error) {
    console.error('LLM分析失败:', error);
    res.status(500).json({
      success: false,
      message: 'LLM分析失败',
      error: error.message
    });
  }
});

/**
 * 多文档智能分析 - 前端需要的端点
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { document_ids, merge_results, merchant_type } = req.body;
    const { user } = req;

    if (!document_ids || document_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要分析的文档'
      });
    }

    console.log(`🧠 用户 ${user.userId} 请求多文档智能分析: ${document_ids.length} 个文档`);
    console.log(`🔄 合并结果: ${merge_results}`);

    // 调用真实的Python服务进行分析
    const response = await axios.post('http://localhost:8000/api/llm/analyze', {
      document_ids: document_ids,
      merchant_type: merchant_type || 'factory'
    }, {
      timeout: 120000 // 2分钟超时
    });

    if (response.data.success) {
      return res.json(response.data);
    } else {
      throw new Error(response.data.message || 'LLM分析失败');
    }

  } catch (error) {
    console.error('❌ LLM分析失败:', error.message);
    return res.status(500).json({
      success: false,
      message: `LLM分析失败: ${error.message}`
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
 * 获取文档的LLM建议
 */
router.get('/suggestions/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { user } = req;

    console.log(`💡 用户 ${user.userId} 请求文档建议: ${documentId}`);

    const result = await documentService.getDocumentSuggestions(parseInt(documentId));

    if (result.success) {
      console.log(`✅ 获取建议成功: ${documentId}, 建议数量: ${result.data.suggestions.length}`);
      res.json({
        success: true,
        message: '获取建议成功',
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || '未找到建议'
      });
    }

  } catch (error) {
    console.error('获取建议失败:', error);
    res.status(500).json({
      success: false,
      message: '获取建议失败',
      error: error.message
    });
  }
});

/**
 * 一键处理：上传 + 解析 + LLM分析
 */
router.post('/process', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { user } = req;
    const { application_id, merchant_type, auto_detect_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 支持自动推荐商家类型
    let finalMerchantType = merchant_type;
    if (auto_detect_type === 'true' || !merchant_type) {
      console.log('🎯 将自动推荐商家类型');
      finalMerchantType = 'factory'; // 默认推荐工厂类型，后续可以通过LLM分析优化
    }

    console.log(`🚀 用户 ${user.userId} 开始一键处理文档: ${file.originalname}, 商家类型: ${finalMerchantType}`);

    // 步骤1: 上传文档
    const uploadResult = await documentService.uploadDocument(file, user.userId, application_id);
    if (!uploadResult.success) {
      throw new Error(`上传失败: ${uploadResult.message}`);
    }

    const documentId = uploadResult.data.document_id;
    console.log(`📄 文档上传成功: ${documentId}`);

    // 步骤2: 解析文档
    const parseResult = await documentService.parseDocument(documentId);
    if (!parseResult.success) {
      throw new Error(`解析失败: ${parseResult.message}`);
    }
    console.log(`🔍 文档解析成功: ${documentId}`);

    // 步骤3: LLM分析
    const analyzeResult = await documentService.analyzeWithLLM(documentId, finalMerchantType);
    if (!analyzeResult.success) {
      throw new Error(`LLM分析失败: ${analyzeResult.message}`);
    }
    console.log(`🤖 LLM分析成功: ${documentId}`);

    // 添加推荐的商家类型到分析结果中
    const finalAnalyzeResult = { ...analyzeResult.data };
    if (auto_detect_type === 'true' || !merchant_type) {
      finalAnalyzeResult.recommended_merchant_type = finalMerchantType;
    }

    res.json({
      success: true,
      message: '文档处理完成',
      data: {
        document_id: documentId,
        upload_result: uploadResult.data,
        parse_result: parseResult.data,
        analyze_result: finalAnalyzeResult
      }
    });

  } catch (error) {
    console.error('文档处理失败:', error);
    res.status(500).json({
      success: false,
      message: '文档处理失败',
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
 * 测试Python服务连接
 */
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 用户 ${req.user.userId} 请求测试Python服务连接`);

    // 测试Python服务连接
    const response = await axios.get('http://localhost:8000/health');

    if (response.data.status === 'ok') {
      console.log(`✅ Python服务连接测试成功`);
      res.json({
        success: true,
        message: 'Python服务连接测试成功',
        data: response.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Python服务连接测试失败'
      });
    }

  } catch (error) {
    console.error('Python服务连接测试失败:', error);
    res.status(500).json({
      success: false,
      message: 'Python服务连接测试失败',
      error: error.message
    });
  }
});

module.exports = router;
