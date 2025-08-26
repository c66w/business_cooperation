/**
 * 真实数据库连接配置
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'business_cooperation',
  charset: 'utf8mb4',
  timezone: '+08:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 连接池配置
const poolConfig = {
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

// 创建连接池
let pool = null;

/**
 * 初始化数据库连接池
 */
async function initializePool() {
  try {
    pool = mysql.createPool(poolConfig);
    
    // 测试连接
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
}

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    throw new Error('数据库连接池未初始化，请先调用 initializePool()');
  }
  return pool;
}

/**
 * 执行SQL查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function execute(sql, params = []) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('SQL执行失败:', error.message);
    console.error('SQL语句:', sql);
    console.error('参数:', params);
    throw error;
  }
}

/**
 * 开始事务
 * @returns {Promise<Object>} 事务连接对象
 */
async function beginTransaction() {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    return {
      connection,
      execute: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      },
      commit: async () => {
        await connection.commit();
        connection.release();
      },
      rollback: async () => {
        await connection.rollback();
        connection.release();
      }
    };
  } catch (error) {
    console.error('开始事务失败:', error.message);
    throw error;
  }
}

/**
 * 关闭数据库连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('数据库连接池已关闭');
  }
}

/**
 * 检查表是否存在
 * @param {string} tableName - 表名
 * @returns {Promise<boolean>} 表是否存在
 */
async function tableExists(tableName) {
  try {
    const sql = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `;
    const rows = await execute(sql, [dbConfig.database, tableName]);
    return rows[0].count > 0;
  } catch (error) {
    console.error(`检查表 ${tableName} 是否存在失败:`, error.message);
    return false;
  }
}

/**
 * 检查列是否存在
 * @param {string} tableName - 表名
 * @param {string} columnName - 列名
 * @returns {Promise<boolean>} 列是否存在
 */
async function columnExists(tableName, columnName) {
  try {
    const sql = `
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    `;
    const rows = await execute(sql, [dbConfig.database, tableName, columnName]);
    return rows[0].count > 0;
  } catch (error) {
    console.error(`检查列 ${tableName}.${columnName} 是否存在失败:`, error.message);
    return false;
  }
}

/**
 * 创建数据库连接对象（兼容现有代码）
 */
function createConnection() {
  return {
    execute,
    beginTransaction,
    commit: async () => {
      // 对于非事务操作，这个方法不需要做任何事情
      console.log('非事务操作，跳过commit');
    },
    rollback: async () => {
      // 对于非事务操作，这个方法不需要做任何事情
      console.log('非事务操作，跳过rollback');
    }
  };
}

module.exports = {
  initializePool,
  getPool,
  execute,
  beginTransaction,
  closePool,
  tableExists,
  columnExists,
  createConnection,
  dbConfig
};
