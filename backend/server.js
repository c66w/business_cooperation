const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const dbConfig = require('./config/database');
const { isValidUserId, sanitizeString, isValidQueryResult } = require('./utils/validators');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// 获取所有商家合作数据（关联查询）
app.get('/api/review/list', async (req, res) => {
  try {
    // 并行查询两张表的数据
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

    res.json({
      success: true,
      data: reviewData,
      total: reviewData.length
    });
  } catch (error) {
    console.error('获取商家合作数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商家合作数据失败',
      error: error.message
    });
  }
});

// 根据user_id获取详细信息
app.get('/api/review/detail/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确'
      });
    }

    // 并行查询用户的合作信息和文档
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

    res.json({
      success: true,
      data: {
        cooperation: cooperations[0], // 取第一条记录，因为user_id是唯一的
        documents: documents
      }
    });
  } catch (error) {
    console.error('获取详细信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取详细信息失败',
      error: error.message
    });
  }
});



// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
