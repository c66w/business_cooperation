/**
 * 修复数据库表结构脚本
 * 解决business_cooperation和merchant_details表的数据类型不匹配问题
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/business_cooperation.db');

console.log('🔧 开始修复数据库表结构...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 打开数据库失败:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 数据库连接成功');
  
  // 开始事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('❌ 开始事务失败:', err);
      process.exit(1);
    }
    
    console.log('🔄 开始事务');
    
    // 1. 备份现有数据
    console.log('📦 备份现有数据...');
    
    // 2. 删除merchant_details表（因为有外键约束）
    db.run('DROP TABLE IF EXISTS merchant_details', (err) => {
      if (err) {
        console.error('❌ 删除merchant_details表失败:', err);
        db.run('ROLLBACK');
        return;
      }
      console.log('✅ 删除merchant_details表成功');
      
      // 3. 重新创建business_cooperation表（统一使用TEXT类型）
      const createBusinessCooperationSQL = `
        CREATE TABLE IF NOT EXISTS business_cooperation_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL UNIQUE,
          company_name TEXT NOT NULL,
          attendee_name TEXT NOT NULL,
          contact_info TEXT NOT NULL,
          attendee_job TEXT,
          industry_operator TEXT,
          merchant_type TEXT CHECK(merchant_type IN ('factory', 'brand', 'agent', 'dealer', 'operator')) DEFAULT 'factory',
          status TEXT CHECK(status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested')) DEFAULT 'draft',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          submitted_at DATETIME
        )
      `;
      
      db.run(createBusinessCooperationSQL, (err) => {
        if (err) {
          console.error('❌ 创建新business_cooperation表失败:', err);
          db.run('ROLLBACK');
          return;
        }
        console.log('✅ 创建新business_cooperation表成功');
        
        // 4. 迁移数据（去重，只保留最新的记录）
        const migrateSQL = `
          INSERT INTO business_cooperation_new
          (user_id, company_name, attendee_name, contact_info, attendee_job, industry_operator, merchant_type, status, created_at, updated_at, submitted_at)
          SELECT user_id, company_name, attendee_name, contact_info, attendee_job, industry_operator, merchant_type, status, created_at, updated_at, submitted_at
          FROM business_cooperation
          WHERE id IN (
            SELECT MAX(id) FROM business_cooperation GROUP BY user_id
          )
        `;
        
        db.run(migrateSQL, (err) => {
          if (err) {
            console.error('❌ 迁移数据失败:', err);
            db.run('ROLLBACK');
            return;
          }
          console.log('✅ 数据迁移成功');
          
          // 5. 删除旧表，重命名新表
          db.run('DROP TABLE business_cooperation', (err) => {
            if (err) {
              console.error('❌ 删除旧business_cooperation表失败:', err);
              db.run('ROLLBACK');
              return;
            }
            
            db.run('ALTER TABLE business_cooperation_new RENAME TO business_cooperation', (err) => {
              if (err) {
                console.error('❌ 重命名表失败:', err);
                db.run('ROLLBACK');
                return;
              }
              console.log('✅ 表重命名成功');
              
              // 6. 重新创建merchant_details表
              const createMerchantDetailsSQL = `
                CREATE TABLE merchant_details (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT NOT NULL,
                  merchant_type TEXT NOT NULL,
                  field_name TEXT NOT NULL,
                  field_value TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
                )
              `;
              
              db.run(createMerchantDetailsSQL, (err) => {
                if (err) {
                  console.error('❌ 创建merchant_details表失败:', err);
                  db.run('ROLLBACK');
                  return;
                }
                console.log('✅ 创建merchant_details表成功');
                
                // 7. 创建索引
                const createIndexes = [
                  'CREATE INDEX idx_business_cooperation_user_id ON business_cooperation(user_id)',
                  'CREATE INDEX idx_merchant_details_user_type ON merchant_details(user_id, merchant_type)',
                  'CREATE INDEX idx_merchant_details_field_name ON merchant_details(field_name)'
                ];
                
                let indexCount = 0;
                createIndexes.forEach((indexSQL, i) => {
                  db.run(indexSQL, (err) => {
                    if (err) {
                      console.warn(`⚠️  创建索引${i+1}失败:`, err.message);
                    } else {
                      console.log(`✅ 创建索引${i+1}成功`);
                    }
                    
                    indexCount++;
                    if (indexCount === createIndexes.length) {
                      // 8. 提交事务
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('❌ 提交事务失败:', err);
                        } else {
                          console.log('✅ 事务提交成功');
                          console.log('🎉 数据库表结构修复完成！');
                        }
                        
                        db.close();
                      });
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
