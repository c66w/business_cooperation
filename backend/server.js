require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// const dbConfig = require('./config/database'); // 暂时注释掉，主要使用SQLite
const { isValidUserId, sanitizeString, isValidQueryResult } = require('./utils/validators');

// 导入数据库连接
const { initializeDatabase: initializeSQLite } = require('./config/database-sqlite');

// 导入路由
const authRouter = require('./routes/auth');
const merchantRouter = require('./routes/merchant');
const reviewRouter = require('./routes/review');
const adminRouter = require('./routes/admin');
const reviewerRouter = require('./routes/reviewer');
const documentRouter = require('./routes/document');
const formRouter = require('./routes/form');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// CORS配置 - 支持生产环境部署
const corsOptions = {
  origin: function (origin, callback) {
    // 允许所有localhost和127.0.0.1的请求，以及生产环境的同源请求
    if (!origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));

// 额外的CORS头设置（兼容性）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(__dirname));

// 静态文件服务（用于文件上传）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 基础路由
app.get('/', (req, res) => {
  res.json({
    message: '商家申请审核系统 API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 注册路由
app.use('/api/auth', authRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/review', reviewRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviewer', reviewerRouter);
app.use('/api/document', documentRouter);
app.use('/api/form', formRouter);

// LLM智能分析接口 - 基础信息阶段
app.post('/api/llm/analyze/basic', async (req, res) => {
  try {
    const { documents, currentData } = req.body;

    console.log('🔍 收到基础信息智能分析请求:');
    console.log('📋 请求体:', JSON.stringify(req.body, null, 2));
    console.log('📄 documents类型:', typeof documents);
    console.log('📄 documents值:', documents);
    console.log('📄 documents是否为数组:', Array.isArray(documents));
    console.log('📄 documentsCount:', documents?.length || 0);
    console.log('📊 currentData:', currentData);

    // 使用本地LLM服务进行分析
    const LLMService = require('./services/LLMService');
    const llmService = new LLMService();

    try {
      // 实时解析文档内容
      let documentContent = '';

      if (documents && documents.length > 0) {
        console.log('🔍 开始实时解析文档内容...');

        for (const doc of documents) {
          try {
            // 从文档URL提取OSS key
            const ossUrl = doc.url;
            if (!ossUrl) {
              throw new Error(`文档缺少URL: ${doc.name}`);
            }

            // 提取OSS key (去掉域名部分)
            const ossKey = ossUrl.replace(/^https?:\/\/[^\/]+\//, '');
            console.log(`📥 从OSS下载文档: ${ossKey}`);

            // 从OSS下载文件数据
            const { getOSSService } = require('./services/OSSService');
            const ossService = getOSSService();
            const fileData = await ossService.downloadFile(ossKey);

            // 调用文档提取服务解析内容
            const { getDocumentExtractService } = require('./services/DocumentExtractService');
            const documentExtractService = getDocumentExtractService();
            const extractResult = await documentExtractService.extractFromBytes(fileData, doc.name);

            console.log(`✅ 文档解析成功: ${doc.name}, 提取内容长度: ${extractResult.fullText.length}`);

            // 添加解析后的内容
            documentContent += `文档名称: ${doc.name}\n`;
            documentContent += `文档内容:\n${extractResult.fullText}\n\n`;

          } catch (docError) {
            console.error(`❌ 文档解析失败: ${doc.name}`, docError);
            throw new Error(`文档解析失败: ${doc.name} - ${docError.message}`);
          }
        }
      }

      // 添加当前数据到分析内容
      if (currentData) {
        documentContent += `\n\n当前表单数据:\n${JSON.stringify(currentData, null, 2)}`;
      }

      // 如果没有任何内容，直接报错
      if (!documentContent.trim()) {
        throw new Error('没有可分析的文档内容，请先上传文档');
      }

      // 调用本地LLM服务进行基础信息分析
      const analysisResult = await llmService.analyzeBasicInfo(
        documentContent || '基础信息阶段分析',
        currentData || {}
      );

      console.log('✅ 基础信息LLM分析完成');

      // 提取字段数据（新的扁平化结构）
      const { confidence_score, suggestions, ...fields } = analysisResult;

      console.log('📤 返回给前端的数据结构:', {
        fields: fields,
        suggestions: suggestions || [],
        stage: 'basic',
        confidence_score: confidence_score || 0.8
      });

      return res.json({
        success: true,
        data: {
          fields: fields,
          suggestions: suggestions || [],
          stage: 'basic',
          confidence_score: confidence_score || 0.8
        }
      });

    } catch (error) {
      console.error('❌ 本地LLM服务分析失败:', error.message);
      return res.status(500).json({
        success: false,
        message: `LLM分析失败: ${error.message}`
      });
    }

  } catch (error) {
    console.error('基础信息智能分析失败:', error);
    res.status(500).json({
      success: false,
      message: '基础信息智能分析失败',
      error: error.message
    });
  }
});

// LLM智能分析接口 - 详细信息阶段
app.post('/api/llm/analyze/detailed', async (req, res) => {
  try {
    const { documents, currentData, merchantType } = req.body;

    // 优先使用currentData中的merchant_type，如果没有再使用merchantType参数
    const actualMerchantType = currentData?.merchant_type || merchantType;

    console.log('收到详细信息智能分析请求:', {
      documentsCount: documents?.length || 0,
      merchantType: merchantType,
      actualMerchantType: actualMerchantType,
      currentData: currentData
    });

    // 验证商家类型
    if (!actualMerchantType) {
      return res.status(400).json({
        success: false,
        message: '缺少商家类型信息，无法进行详细分析'
      });
    }

    // 使用本地LLM服务进行详细信息分析
    const LLMService = require('./services/LLMService');
    const llmService = new LLMService();

    try {
      // 实时解析文档内容
      let documentContent = '';

      if (documents && documents.length > 0) {
        console.log('🔍 开始实时解析文档内容（详细信息阶段）...');

        for (const doc of documents) {
          try {
            // 从文档URL提取OSS key
            const ossUrl = doc.url;
            if (!ossUrl) {
              throw new Error(`文档缺少URL: ${doc.name}`);
            }

            // 提取OSS key (去掉域名部分)
            const ossKey = ossUrl.replace(/^https?:\/\/[^\/]+\//, '');
            console.log(`📥 从OSS下载文档: ${ossKey}`);

            // 从OSS下载文件数据
            const { getOSSService } = require('./services/OSSService');
            const ossService = getOSSService();
            const fileData = await ossService.downloadFile(ossKey);

            // 调用文档提取服务解析内容
            const { getDocumentExtractService } = require('./services/DocumentExtractService');
            const documentExtractService = getDocumentExtractService();
            const extractResult = await documentExtractService.extractFromBytes(fileData, doc.name);

            console.log(`✅ 文档解析成功: ${doc.name}, 提取内容长度: ${extractResult.fullText.length}`);

            // 添加解析后的内容
            documentContent += `文档名称: ${doc.name}\n`;
            documentContent += `文档内容:\n${extractResult.fullText}\n\n`;

          } catch (docError) {
            console.error(`❌ 文档解析失败: ${doc.name}`, docError);
            throw new Error(`文档解析失败: ${doc.name} - ${docError.message}`);
          }
        }
      }

      // 添加当前数据到分析内容，包含更详细的信息
      if (currentData) {
        documentContent += `\n\n详细表单数据:\n${JSON.stringify(currentData, null, 2)}`;
        documentContent += `\n\n商家类型: ${actualMerchantType}`;
      }

      // 如果没有任何内容，直接报错
      if (!documentContent.trim()) {
        throw new Error('没有可分析的文档内容，请先上传文档');
      }

      // 调用本地LLM服务进行详细信息分析
      const analysisResult = await llmService.analyzeDetailedInfo(
        documentContent || '详细信息阶段分析',
        currentData || {},
        actualMerchantType
      );

      console.log('✅ 详细信息LLM分析完成');

      // 提取字段数据（新的扁平化结构）
      const { confidence_score, suggestions, ...fields } = analysisResult;
      const finalSuggestions = suggestions || [];

      // 为详细分析添加更多建议
      finalSuggestions.push(
        `基于${actualMerchantType}类型的专业建议已生成`,
        '建议完善相关资质证明文件',
        '确保所有必填字段信息准确完整'
      );

      return res.json({
        success: true,
        data: {
          fields: fields,
          suggestions: finalSuggestions,
          stage: 'detailed',
          merchant_type: actualMerchantType,
          confidence_score: confidence_score || 0.8
        }
      });

    } catch (error) {
      console.error('❌ 本地LLM服务详细分析失败:', error.message);
      return res.status(500).json({
        success: false,
        message: `详细信息LLM分析失败: ${error.message}`
      });
    }

  } catch (error) {
    console.error('详细信息智能分析失败:', error);
    res.status(500).json({
      success: false,
      message: '详细信息智能分析失败',
      error: error.message
    });
  }
});

// 表单字段配置接口 - 使用本地SQLite数据库
app.get('/api/form/fields/:type', async (req, res) => {
  try {
    const { type } = req.params;

    // 验证商家类型
    const validTypes = ['factory', 'brand', 'agent', 'dealer', 'operator'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的商家类型'
      });
    }

    try {
      const { execute } = require('./config/database-sqlite');

      // 从SQLite数据库查询字段配置
      const fields = await execute(`
        SELECT
          field_name,
          field_label,
          field_type,
          field_options,
          is_required,
          validation_rules,
          display_order
        FROM merchant_type_fields
        WHERE merchant_type = ? AND is_active = 1
        ORDER BY display_order ASC
      `, [type]);

      console.log(`✅ SQLite查询字段配置成功: ${type} 类型 ${fields.length} 个字段`);

      if (fields.length > 0) {
        // 转换字段格式
        const formattedFields = fields.map(field => ({
          name: field.field_name,
          label: field.field_label,
          type: field.field_type,
          options: field.field_options ? JSON.parse(field.field_options) : null,
          required: Boolean(field.is_required),
          rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
          order: field.display_order
        }));

        res.json({
          success: true,
          data: formattedFields
        });
      } else {
        // 数据库中没有配置，使用默认配置
        console.log(`⚠️  数据库中没有 ${type} 类型的字段配置，使用默认配置`);
        const defaultFields = getDefaultFieldsConfig(type);

        res.json({
          success: true,
          data: defaultFields
        });
      }

    } catch (sqliteError) {
      console.warn('⚠️  SQLite查询失败，使用默认配置:', sqliteError.message);

      // 使用默认字段配置
      const defaultFields = getDefaultFieldsConfig(type);

      res.json({
        success: true,
        data: defaultFields
      });
    }

  } catch (error) {
    console.error('获取字段配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字段配置失败',
      error: error.message
    });
  }
});

// 默认字段配置函数 - 使用统一的配置文件
function getDefaultFieldsConfig(type) {
  const { getFieldsForFrontend } = require('./config/merchant-fields');
  
  const commonFields = [
    { name: 'product_category', label: '产品类别', type: 'select', required: true, order: 1,
      options: [
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
      ] },
    { name: 'company_description', label: '公司简介', type: 'textarea', required: true, order: 2 }
  ];

  // 从统一配置文件获取类型特定字段
  const typeSpecificFields = getFieldsForFrontend(type).map(field => ({
    ...field,
    order: field.order + 2 // 调整顺序，在通用字段之后
  }));

  return [...commonFields, ...typeSpecificFields];
}

// 数据库查询函数 - 暂时禁用远程数据库，主要使用SQLite
async function executeSQL(sql) {
  throw new Error('远程数据库查询已禁用，请使用SQLite数据库');
}

// SQL查询语句
const SQL_QUERIES = {
  // 获取所有商家合作信息
  getBusinessCooperations: `
    SELECT
      user_id,
      company_name,
      attendee_name,
      contact_info,
      attendee_job,
      industry_operator
    FROM business_cooperation
    ORDER BY user_id
  `,



  // 根据user_id获取商家合作信息
  getBusinessCooperationByUserId: (userId) => {
    const cleanUserId = sanitizeString(userId);
    return `
      SELECT
        user_id,
        company_name,
        attendee_name,
        contact_info,
        attendee_job,
        industry_operator
      FROM business_cooperation
      WHERE user_id = '${cleanUserId}'
    `;
  },


};

// API路由

// 测试数据库连接
app.get('/api/test/connection', async (req, res) => {
  try {
    const testSQL = 'SELECT 1 as test';
    const result = await executeSQL(testSQL);

    res.json({
      success: true,
      message: '数据库连接正常',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error.message
    });
  }
});

// 获取所有商家合作数据（关联查询）- 使用本地SQLite数据库
app.get('/api/review/list', async (req, res) => {
  try {
    // 尝试使用SQLite数据库
    try {
      const { execute } = require('./config/database-sqlite');

      // 查询商家合作数据
      const cooperations = await execute(`
        SELECT
          user_id,
          company_name,
          attendee_name,
          contact_info,
          attendee_job,
          industry_operator,
          merchant_type,
          status,
          created_at,
          updated_at,
          submitted_at
        FROM business_cooperation
        ORDER BY created_at DESC
      `);

      // 查询资质文档数据 - 统一使用document_uploads表
      const documents = await execute(`
        SELECT
          application_id,
          original_name as file_name,
          oss_url as file_url,
          id as file_id,
          file_type,
          datetime(upload_time) as upload_time
        FROM document_uploads
        ORDER BY upload_time DESC
      `);

      // 关联数据：为每个合作信息添加对应的文档
      const reviewData = cooperations.map(cooperation => {
        const userDocuments = documents.filter(doc => doc.user_id === cooperation.user_id);
        return {
          ...cooperation,
          documents: userDocuments
        };
      });

      console.log(`✅ SQLite查询成功: ${cooperations.length} 条商家记录, ${documents.length} 条文档记录`);

      res.json({
        success: true,
        data: reviewData,
        total: reviewData.length
      });

    } catch (sqliteError) {
      console.warn('⚠️  SQLite查询失败，尝试远程API:', sqliteError.message);

      // 回退到远程API
      const [cooperationsResult, documentsResult] = await Promise.all([
        executeSQL(SQL_QUERIES.getBusinessCooperations),
        executeSQL(SQL_QUERIES.getQualificationDocuments)
      ]);

      // 检查查询结果
      if (cooperationsResult.status !== 'success' || documentsResult.status !== 'success') {
        throw new Error('数据库查询失败');
      }

      const cooperations = cooperationsResult.data?.result_data || [];
      const documents = documentsResult.data?.result_data || [];

      // 关联数据：为每个合作信息添加对应的文档
      const reviewData = cooperations.map(cooperation => {
        const userDocuments = documents.filter(doc => doc.user_id === cooperation.user_id);
        return {
          ...cooperation,
          documents: userDocuments
        };
      });

      console.log(`✅ 远程API查询成功: ${cooperations.length} 条商家记录, ${documents.length} 条文档记录`);

      res.json({
        success: true,
        data: reviewData,
        total: reviewData.length
      });
    }

  } catch (error) {
    console.error('获取商家合作数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商家合作数据失败',
      error: error.message
    });
  }
});

// 根据application_id获取详细信息 - 使用本地SQLite数据库
app.get('/api/review/detail/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: '申请ID不能为空'
      });
    }

    // 尝试使用SQLite数据库
    try {
      const { execute } = require('./config/database-sqlite');

      // 查询申请的合作信息
      const cooperations = await execute(`
        SELECT
          user_id,
          company_name,
          attendee_name,
          contact_info,
          attendee_job,
          industry_operator,
          merchant_type,
          status,
          created_at,
          updated_at,
          submitted_at
        FROM business_cooperation
        WHERE application_id = ?
      `, [applicationId]);

      // 查询申请的文档信息 - 使用DocumentService统一查询
      const DocumentService = require('./services/DocumentService');
      const documentService = new DocumentService();
      const documentsResult = await documentService.getApplicationDocuments(applicationId);
      const documents = documentsResult.data;

      // 查询申请的详细字段信息
      const details = await execute(`
        SELECT
          field_name,
          field_value
        FROM merchant_details
        WHERE application_id = ?
      `, [applicationId]);

      if (cooperations.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到该申请的合作信息'
        });
      }

      // 将详细字段转换为前端期望的数组格式
      const dynamicFields = details.map(d => ({
        field_name: d.field_name,
        field_value: d.field_value
      }));

      const cooperation = {
        ...cooperations[0],
        dynamic_fields: dynamicFields
      };

      console.log(`✅ SQLite查询成功: 申请 ${applicationId} 的详细信息`);

      res.json({
        success: true,
        data: {
          cooperation,
          documents,
          details: dynamicFields  // 添加details字段供前端使用
        }
      });

    } catch (sqliteError) {
      console.error('❌ SQLite查询失败:', sqliteError.message);
      
      // 直接抛出错误，不进行远程API回退
      throw new Error(`获取申请详情失败: ${sqliteError.message}`);
    }

  } catch (error) {
    console.error('获取详细信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取详细信息失败',
      error: error.message
    });
  }
});

// 生产环境：服务前端静态文件
if (process.env.NODE_ENV === 'production') {
  // 服务前端构建文件
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // 处理React Router的路由，返回index.html
  app.get('*', (req, res) => {
    // 排除API路由
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 服务器启动成功，监听端口 ${PORT}`);

  // 初始化SQLite数据库
  try {
    console.log('🔄 尝试连接SQLite数据库...');
    await initializeSQLite();
    console.log('✅ SQLite数据库连接成功');
    console.log('✅ 商家申请审核系统启动完成');
  } catch (error) {
    console.error('❌ SQLite数据库初始化失败:', error);
    console.error('❌ 服务器无法启动');
    process.exit(1);
  }
});
