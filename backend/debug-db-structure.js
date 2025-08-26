/**
 * 调试数据库结构脚本
 * 直接检查SQLite数据库的表结构和外键约束
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/business_cooperation.db');

console.log('🔍 检查数据库文件:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ 打开数据库失败:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 数据库连接成功');
  
  // 检查外键约束状态
  db.get('PRAGMA foreign_keys', (err, row) => {
    if (err) {
      console.error('❌ 检查外键状态失败:', err);
    } else {
      console.log('🔍 外键约束状态:', row);
    }
    
    // 检查business_cooperation表结构
    db.all('PRAGMA table_info(business_cooperation)', (err, rows) => {
      if (err) {
        console.error('❌ 检查business_cooperation表结构失败:', err);
      } else {
        console.log('\n🔍 business_cooperation表结构:');
        rows.forEach(row => {
          console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
        });
      }
      
      // 检查merchant_details表结构
      db.all('PRAGMA table_info(merchant_details)', (err, rows) => {
        if (err) {
          console.error('❌ 检查merchant_details表结构失败:', err);
        } else {
          console.log('\n🔍 merchant_details表结构:');
          rows.forEach(row => {
            console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
          });
        }
        
        // 检查外键约束
        db.all('PRAGMA foreign_key_list(merchant_details)', (err, rows) => {
          if (err) {
            console.error('❌ 检查外键约束失败:', err);
          } else {
            console.log('\n🔍 merchant_details外键约束:');
            if (rows.length === 0) {
              console.log('  ❌ 没有找到外键约束！');
            } else {
              rows.forEach(row => {
                console.log(`  外键 ${row.from} -> ${row.table}.${row.to}`);
              });
            }
          }
          
          // 检查索引
          db.all('PRAGMA index_list(merchant_details)', (err, rows) => {
            if (err) {
              console.error('❌ 检查索引失败:', err);
            } else {
              console.log('\n🔍 merchant_details索引:');
              rows.forEach(row => {
                console.log(`  ${row.name}: ${row.unique ? 'UNIQUE' : 'INDEX'}`);
              });
            }
            
            // 检查现有数据
            db.all('SELECT user_id, company_name FROM business_cooperation LIMIT 5', (err, rows) => {
              if (err) {
                console.error('❌ 查询business_cooperation数据失败:', err);
              } else {
                console.log('\n🔍 business_cooperation现有数据:');
                rows.forEach(row => {
                  console.log(`  ${row.user_id}: ${row.company_name}`);
                });
              }
              
              // 关闭数据库
              db.close((err) => {
                if (err) {
                  console.error('❌ 关闭数据库失败:', err);
                } else {
                  console.log('\n✅ 数据库检查完成');
                }
              });
            });
          });
        });
      });
    });
  });
});
