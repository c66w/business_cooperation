require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const dbConfig = require('./config/database');
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

// 注册路由
app.use('/api/auth', authRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/review', reviewRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviewer', reviewerRouter);
app.use('/api/document', documentRouter);

// LLM智能分析接口 - 基础信息阶段
app.post('/api/llm/analyze/basic', async (req, res) => {
  try {
    const { documents, currentData } = req.body;

    console.log('收到基础信息智能分析请求:', {
      documentsCount: documents?.length || 0,
      currentData: currentData
    });

    // 调用真实的Python服务进行LLM分析
    try {
      const response = await axios.post('http://localhost:8000/api/llm/analyze', {
        documents: documents,
        stage: 'basic',
        current_data: currentData
      }, {
        timeout: 120000 // 2分钟超时
      });

      if (response.data.success) {
        return res.json(response.data);
      } else {
        throw new Error(response.data.message || 'LLM分析失败');
      }
    } catch (error) {
      console.error('❌ Python服务LLM分析失败:', error.message);
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

    // 调用真实的Python服务进行详细信息LLM分析
    try {
      const response = await axios.post('http://localhost:8000/api/llm/analyze', {
        documents: documents,
        stage: 'detailed',
        merchant_type: actualMerchantType,
        current_data: currentData
      }, {
        timeout: 120000 // 2分钟超时
      });

      if (response.data.success) {
        return res.json(response.data);
      } else {
        throw new Error(response.data.message || 'LLM分析失败');
      }
    } catch (error) {
      console.error('❌ Python服务详细信息LLM分析失败:', error.message);
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

// 默认字段配置函数
function getDefaultFieldsConfig(type) {
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

  const typeSpecificFields = {
    factory: [
      { name: 'specific_products', label: '具体产品', type: 'text', required: true, order: 3 },
      { name: 'own_brand', label: '自有品牌', type: 'text', required: false, order: 4, placeholder: '没有填无，有就填写具体品牌名称' },
      { name: 'own_brand_operation_ability', label: '自有品牌运营能力', type: 'text', required: false, order: 5, placeholder: '没有填无，指店铺运营、客服、物流等能力' },
      { name: 'oem_famous_brands', label: '代工的知名品牌', type: 'text', required: false, order: 6, placeholder: '填写具体品牌名称' },
      { name: 'annual_production_capacity', label: '年生产规模（产能优势）', type: 'text', required: true, order: 7, placeholder: '最大产出能力' },
      { name: 'need_mold_or_repackage', label: '是否需要开模或改包装', type: 'radio', required: false, order: 8,
        options: ['是', '否', '未确认'] },
      { name: 'estimated_mold_time', label: '预计开模/改包装时间', type: 'text', required: false, order: 9, placeholder: '示例：x天、x个月' },
      { name: 'accept_brand_cocreation', label: '是否接受品牌共创', type: 'radio', required: true, order: 10,
        options: ['是', '否'], description: '品牌属于遥望或遥望合资公司' },
      { name: 'accept_deep_cooperation', label: '是否接受深度合作', type: 'radio', required: true, order: 11,
        options: ['是', '否'] },
      { name: 'accept_online_exclusive', label: '是否接受线上/全渠道独家', type: 'radio', required: true, order: 12,
        options: ['是', '否'] },
      { name: 'accept_yaowang_authorization', label: '是否接受遥望授权其他渠道', type: 'radio', required: true, order: 13,
        options: ['是', '否'] },
      { name: 'accept_omnichannel_dividend', label: '是否接受后续全渠道分红', type: 'radio', required: true, order: 14,
        options: ['是', '否'] }
    ],
    brand: [
      { name: 'brand_name', label: '品牌名称', type: 'text', required: true, order: 3, placeholder: '填写具体品牌名称' },
      { name: 'brand_popularity', label: '品牌知名度', type: 'textarea', required: false, order: 4, placeholder: '可上传第三方平台店铺首页截图' },
      { name: 'sales_data', label: '销售数据', type: 'textarea', required: false, order: 5, placeholder: '线上销售、店铺自播、线下商超销售数据' },
      { name: 'cooperation_budget', label: '合作预算', type: 'text', required: false, order: 6, placeholder: '日常销售或营销预算投入' }
    ],
    agent: [
      { name: 'agent_brand_name', label: '代理的品牌名称', type: 'text', required: false, order: 3, placeholder: '没有填无，有就填写代理品牌名称' },
      { name: 'brand_popularity', label: '品牌知名度', type: 'textarea', required: false, order: 4, placeholder: '可上传第三方平台店铺首页截图' },
      { name: 'sales_data', label: '销售数据', type: 'textarea', required: false, order: 5, placeholder: '线上销售、历史合作主播、线下商超销售数据' },
      { name: 'cooperation_budget', label: '合作预算', type: 'text', required: false, order: 6, placeholder: '日常销售或营销预算投入' }
    ],
    dealer: [
      { name: 'dealer_brand_name', label: '经销的品牌名称', type: 'text', required: false, order: 3, placeholder: '没有填无，有就填写经销品牌名称' },
      { name: 'brand_popularity', label: '品牌知名度', type: 'textarea', required: false, order: 4, placeholder: '可上传第三方平台店铺首页截图' },
      { name: 'sales_data', label: '销售数据', type: 'textarea', required: false, order: 5, placeholder: '线上销售、历史合作主播、线下商超销售数据' },
      { name: 'cooperation_budget', label: '合作预算', type: 'text', required: false, order: 6, placeholder: '日常销售或营销预算投入' }
    ],
    operator: [
      { name: 'operator_brand_name', label: '代运营的品牌名称', type: 'text', required: true, order: 3, placeholder: '填写代运营的品牌名称' },
      { name: 'brand_popularity', label: '品牌知名度', type: 'textarea', required: false, order: 4, placeholder: '可上传第三方平台店铺首页截图' },
      { name: 'sales_data', label: '销售数据', type: 'textarea', required: false, order: 5, placeholder: '线上销售、店铺自播、线下商超销售数据' },
      { name: 'cooperation_budget', label: '合作预算', type: 'text', required: false, order: 6, placeholder: '近期日常销售或营销预算可投入的具体金额' }
    ]
  };

  return [...commonFields, ...(typeSpecificFields[type] || [])];
}

// 数据库查询函数
async function executeSQL(sql) {
  try {
    const payload = {
      sql: sql,
      connection_id: dbConfig.connectionId
    };

    console.log('执行SQL查询:', sql);
    console.log('请求地址:', `${dbConfig.baseURL}${dbConfig.endpoints.sqlQuery}`);

    const response = await axios.post(
      `${dbConfig.baseURL}${dbConfig.endpoints.sqlQuery}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: dbConfig.timeout
      }
    );

    console.log('查询结果:', response.data);
    return response.data;
  } catch (error) {
    console.error('Database query error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(`数据库查询失败: ${error.message}`);
  }
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

  // 获取所有资质文档
  getQualificationDocuments: `
    SELECT
      user_id,
      file_name,
      file_url,
      file_id,
      file_type,
      DATE_FORMAT(upload_time, '%Y-%m-%d %H:%i:%s') as upload_time
    FROM business_qualification_document
    ORDER BY upload_time DESC
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

  // 根据user_id获取资质文档
  getDocumentsByUserId: (userId) => {
    const cleanUserId = sanitizeString(userId);
    return `
      SELECT
        user_id,
        file_name,
        file_url,
        file_id,
        file_type,
        DATE_FORMAT(upload_time, '%Y-%m-%d %H:%i:%s') as upload_time
      FROM business_qualification_document
      WHERE user_id = '${cleanUserId}'
      ORDER BY upload_time DESC
    `;
  }
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

      // 查询资质文档数据
      const documents = await execute(`
        SELECT
          user_id,
          file_name,
          file_url,
          file_id,
          file_type,
          datetime(upload_time) as upload_time
        FROM business_qualification_document
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

// 根据user_id获取详细信息 - 使用本地SQLite数据库
app.get('/api/review/detail/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确'
      });
    }

    // 尝试使用SQLite数据库
    try {
      const { execute } = require('./config/database-sqlite');

      // 查询用户的合作信息
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
        WHERE user_id = ?
      `, [userId]);

      // 查询用户的文档信息
      const documents = await execute(`
        SELECT
          user_id,
          file_name,
          file_url,
          file_id,
          file_type,
          datetime(upload_time) as upload_time
        FROM business_qualification_document
        WHERE user_id = ?
        ORDER BY upload_time DESC
      `, [userId]);

      // 查询用户的详细字段信息
      const details = await execute(`
        SELECT
          field_name,
          field_value
        FROM merchant_details
        WHERE user_id = ?
      `, [userId]);

      if (cooperations.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到该用户的合作信息'
        });
      }

      // 将详细字段转换为动态字段格式
      const dynamicFields = details.map(d => `${d.field_name}:${d.field_value}`).join(';');

      const cooperation = {
        ...cooperations[0],
        dynamic_fields: dynamicFields
      };

      console.log(`✅ SQLite查询成功: 用户 ${userId} 的详细信息`);

      res.json({
        success: true,
        data: {
          cooperation,
          documents
        }
      });

    } catch (sqliteError) {
      console.warn('⚠️  SQLite查询失败，尝试远程API:', sqliteError.message);

      // 回退到远程API
      const [cooperationResult, documentsResult] = await Promise.all([
        executeSQL(SQL_QUERIES.getBusinessCooperationByUserId(userId)),
        executeSQL(SQL_QUERIES.getDocumentsByUserId(userId))
      ]);

      // 检查查询结果
      if (cooperationResult.status !== 'success' || documentsResult.status !== 'success') {
        throw new Error('数据库查询失败');
      }

      const cooperations = cooperationResult.data?.result_data || [];
      const documents = documentsResult.data?.result_data || [];

      if (cooperations.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到该用户的合作信息'
        });
      }

      console.log(`✅ 远程API查询成功: 用户 ${userId} 的详细信息`);

      res.json({
        success: true,
        data: {
          cooperation: cooperations[0], // 取第一条记录，因为user_id是唯一的
          documents: documents
        }
      });
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
