const axios = require('axios');
const dbConfig = require('../config/database');

// 测试数据库连接和查询
async function testDatabase() {
  console.log('🔍 开始测试数据库连接...');
  
  try {
    // 测试基本连接
    console.log('\n1. 测试基本连接...');
    const testResult = await executeSQL('SELECT 1 as test');
    console.log('✅ 数据库连接成功:', testResult);

    // 测试表是否存在
    console.log('\n2. 检查表结构...');
    
    // 检查 business_cooperation 表
    const cooperationTableCheck = await executeSQL(`
      SHOW TABLES LIKE 'business_cooperation'
    `);
    console.log('business_cooperation 表检查:', cooperationTableCheck);

    // 检查 business_qualification_document 表
    const documentTableCheck = await executeSQL(`
      SHOW TABLES LIKE 'business_qualification_document'
    `);
    console.log('business_qualification_document 表检查:', documentTableCheck);

    // 测试查询数据
    console.log('\n3. 测试数据查询...');
    
    const cooperationData = await executeSQL(`
      SELECT COUNT(*) as total FROM business_cooperation
    `);
    console.log('business_cooperation 数据量:', cooperationData);

    const documentData = await executeSQL(`
      SELECT COUNT(*) as total FROM business_qualification_document
    `);
    console.log('business_qualification_document 数据量:', documentData);

    console.log('\n🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 执行SQL查询
async function executeSQL(sql) {
  try {
    const payload = {
      sql: sql,
      connection_id: dbConfig.connectionId
    };

    const response = await axios.post(
      `${dbConfig.baseURL}${dbConfig.endpoints.sqlQuery}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: dbConfig.timeout
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`数据库查询失败: ${error.message}`);
  }
}

// 运行测试
if (require.main === module) {
  testDatabase();
}

module.exports = { testDatabase };
