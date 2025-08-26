/**
 * 数据库初始化脚本
 * 执行数据库结构扩展，创建Agent & Workflow系统所需的表
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializePool, execute, tableExists, columnExists, closePool } = require('../config/database-real');

/**
 * 读取SQL文件
 */
function readSQLFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`读取SQL文件失败: ${filePath}`, error.message);
    throw error;
  }
}

/**
 * 执行SQL语句（支持多条语句）
 */
async function executeSQLStatements(sqlContent) {
  // 分割SQL语句（以分号分隔）
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`准备执行 ${statements.length} 条SQL语句`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      console.log(`执行第 ${i + 1} 条语句...`);
      await execute(statement);
      console.log(`✅ 第 ${i + 1} 条语句执行成功`);
    } catch (error) {
      console.error(`❌ 第 ${i + 1} 条语句执行失败:`, error.message);
      console.error('SQL语句:', statement.substring(0, 200) + '...');
      
      // 如果是表已存在的错误，继续执行
      if (error.message.includes('already exists')) {
        console.log('表已存在，继续执行下一条语句');
        continue;
      }
      
      throw error;
    }
  }
}

/**
 * 检查现有表结构
 */
async function checkExistingTables() {
  console.log('\n📋 检查现有表结构...');
  
  const tables = [
    'business_cooperation',
    'business_qualification_document',
    'merchant_details',
    'workflow_tasks',
    'workflow_history',
    'notifications',
    'system_config',
    'merchant_type_fields',
    'reviewers'
  ];

  for (const table of tables) {
    const exists = await tableExists(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }
}

/**
 * 检查需要添加的列
 */
async function checkRequiredColumns() {
  console.log('\n📋 检查需要添加的列...');
  
  const requiredColumns = [
    { table: 'business_cooperation', column: 'merchant_type' },
    { table: 'business_cooperation', column: 'status' },
    { table: 'business_cooperation', column: 'submitted_at' }
  ];

  for (const { table, column } of requiredColumns) {
    const tableExist = await tableExists(table);
    if (tableExist) {
      const columnExist = await columnExists(table, column);
      console.log(`  ${columnExist ? '✅' : '❌'} ${table}.${column}`);
    } else {
      console.log(`  ❌ ${table}.${column} (表不存在)`);
    }
  }
}

/**
 * 主初始化函数
 */
async function initializeDatabase() {
  try {
    console.log('🚀 开始初始化数据库...\n');

    // 1. 初始化数据库连接
    console.log('📡 连接数据库...');
    await initializePool();

    // 2. 检查现有表结构
    await checkExistingTables();
    await checkRequiredColumns();

    // 3. 读取SQL文件
    console.log('\n📄 读取数据库扩展脚本...');
    const sqlFilePath = path.join(__dirname, '../../docs/database-schema.sql');
    const sqlContent = readSQLFile(sqlFilePath);
    console.log(`SQL文件大小: ${sqlContent.length} 字符`);

    // 4. 执行SQL语句
    console.log('\n⚙️  执行数据库扩展...');
    await executeSQLStatements(sqlContent);

    // 5. 验证结果
    console.log('\n🔍 验证数据库结构...');
    await checkExistingTables();
    await checkRequiredColumns();

    // 6. 插入测试数据
    console.log('\n📝 插入测试审核员数据...');
    await insertTestReviewers();

    console.log('\n🎉 数据库初始化完成！');

  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

/**
 * 插入测试审核员数据
 */
async function insertTestReviewers() {
  try {
    const reviewers = [
      {
        reviewer_id: 'reviewer_001',
        name: '张审核',
        email: 'zhang.review@company.com',
        department: '商务部',
        specialties: JSON.stringify(['factory', 'brand']),
        max_concurrent_tasks: 10
      },
      {
        reviewer_id: 'reviewer_002',
        name: '李审核',
        email: 'li.review@company.com',
        department: '运营部',
        specialties: JSON.stringify(['agent', 'dealer', 'operator']),
        max_concurrent_tasks: 8
      }
    ];

    for (const reviewer of reviewers) {
      try {
        const sql = `
          INSERT INTO reviewers (reviewer_id, name, email, department, specialties, max_concurrent_tasks)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          email = VALUES(email),
          department = VALUES(department),
          specialties = VALUES(specialties),
          max_concurrent_tasks = VALUES(max_concurrent_tasks)
        `;
        
        await execute(sql, [
          reviewer.reviewer_id,
          reviewer.name,
          reviewer.email,
          reviewer.department,
          reviewer.specialties,
          reviewer.max_concurrent_tasks
        ]);
        
        console.log(`  ✅ 审核员 ${reviewer.name} 数据已插入/更新`);
      } catch (error) {
        console.error(`  ❌ 插入审核员 ${reviewer.name} 失败:`, error.message);
      }
    }
  } catch (error) {
    console.error('插入测试审核员数据失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase,
  checkExistingTables,
  checkRequiredColumns
};
