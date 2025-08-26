/**
 * SQLite数据库连接配置
 * 轻量级本地数据库解决方案
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库配置
const dbConfig = {
  filename: process.env.SQLITE_DB_PATH || path.join(__dirname, '../data/business_cooperation.db'),
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  verbose: process.env.NODE_ENV === 'development'
};

// 全局数据库连接
let db = null;

/**
 * 初始化SQLite数据库
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // 确保数据目录存在
      const dbDir = path.dirname(dbConfig.filename);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 创建数据库连接
      db = new sqlite3.Database(dbConfig.filename, dbConfig.mode, (err) => {
        if (err) {
          console.error('❌ SQLite数据库连接失败:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite数据库连接成功:', dbConfig.filename);
          
          // 启用外键约束
          db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              console.warn('⚠️  启用外键约束失败:', err.message);
              resolve(db);
            } else {
              console.log('✅ SQLite外键约束已启用');
              // 验证外键约束是否真的启用了
              db.get('PRAGMA foreign_keys', (err, row) => {
                if (err) {
                  console.warn('⚠️  检查外键约束状态失败:', err.message);
                } else {
                  console.log('🔍 外键约束状态验证:', row);
                }
                resolve(db);
              });
            }
          });
        }
      });

      // 设置错误处理
      db.on('error', (err) => {
        console.error('SQLite数据库错误:', err.message);
      });

    } catch (error) {
      console.error('❌ 初始化SQLite数据库失败:', error.message);
      reject(error);
    }
  });
}

/**
 * 获取数据库连接
 */
function getDatabase() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initializeDatabase()');
  }
  return db;
}

/**
 * 执行SQL查询（兼容MySQL接口）
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      
      // 判断是SELECT还是其他操作
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        // SELECT查询
        database.all(sql, params, (err, rows) => {
          if (err) {
            console.error('SQLite查询失败:', err.message);
            console.error('SQL语句:', sql);
            console.error('参数:', params);
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      } else {
        // INSERT, UPDATE, DELETE等操作
        database.run(sql, params, function(err) {
          if (err) {
            console.error('SQLite执行失败:', err.message);
            console.error('SQL语句:', sql);
            console.error('参数:', params);
            reject(err);
          } else {
            // 返回类似MySQL的结果格式
            resolve([{
              insertId: this.lastID,
              affectedRows: this.changes,
              changedRows: this.changes
            }]);
          }
        });
      }
    } catch (error) {
      console.error('SQLite执行异常:', error.message);
      reject(error);
    }
  });
}

/**
 * 开始事务
 * @returns {Promise<Object>} 事务对象
 */
async function beginTransaction() {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      
      database.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('开始事务失败:', err.message);
          reject(err);
        } else {
          console.log('🔄 SQLite事务开始');
          
          // 返回事务对象
          const transaction = {
            execute: async (sql, params = []) => {
              return new Promise((resolve, reject) => {
                try {
                  // 判断是SELECT还是其他操作
                  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

                  if (isSelect) {
                    // SELECT查询
                    database.all(sql, params, (err, rows) => {
                      if (err) {
                        console.error('SQLite事务查询失败:', err.message);
                        console.error('SQL语句:', sql);
                        console.error('参数:', params);
                        reject(err);
                      } else {
                        resolve(rows || []);
                      }
                    });
                  } else {
                    // INSERT, UPDATE, DELETE等操作
                    database.run(sql, params, function(err) {
                      if (err) {
                        console.error('SQLite事务执行失败:', err.message);
                        console.error('SQL语句:', sql);
                        console.error('参数:', params);
                        reject(err);
                      } else {
                        // 返回类似MySQL的结果格式
                        resolve([{
                          insertId: this.lastID,
                          affectedRows: this.changes,
                          changedRows: this.changes
                        }]);
                      }
                    });
                  }
                } catch (error) {
                  console.error('SQLite事务执行异常:', error.message);
                  reject(error);
                }
              });
            },
            commit: async () => {
              return new Promise((resolve, reject) => {
                database.run('COMMIT', (err) => {
                  if (err) {
                    console.error('事务提交失败:', err.message);
                    reject(err);
                  } else {
                    console.log('✅ SQLite事务提交成功');
                    resolve(true);
                  }
                });
              });
            },
            rollback: async () => {
              return new Promise((resolve, reject) => {
                database.run('ROLLBACK', (err) => {
                  if (err) {
                    console.error('事务回滚失败:', err.message);
                    reject(err);
                  } else {
                    console.log('❌ SQLite事务回滚成功');
                    resolve(true);
                  }
                });
              });
            }
          };
          
          resolve(transaction);
        }
      });
    } catch (error) {
      console.error('开始事务异常:', error.message);
      reject(error);
    }
  });
}

/**
 * 关闭数据库连接
 */
async function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('关闭数据库失败:', err.message);
        } else {
          console.log('SQLite数据库连接已关闭');
        }
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
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
      FROM sqlite_master 
      WHERE type='table' AND name=?
    `;
    const rows = await execute(sql, [tableName]);
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
    const sql = `PRAGMA table_info(${tableName})`;
    const rows = await execute(sql);
    return rows.some(row => row.name === columnName);
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

/**
 * 获取数据库信息
 */
async function getDatabaseInfo() {
  try {
    const tables = await execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    return {
      type: 'SQLite',
      filename: dbConfig.filename,
      tables: tables.map(t => t.name),
      size: fs.existsSync(dbConfig.filename) ? fs.statSync(dbConfig.filename).size : 0
    };
  } catch (error) {
    console.error('获取数据库信息失败:', error.message);
    return null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  execute,
  beginTransaction,
  closeDatabase,
  tableExists,
  columnExists,
  createConnection,
  getDatabaseInfo,
  dbConfig
};
