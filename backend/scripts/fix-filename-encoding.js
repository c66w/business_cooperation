#!/usr/bin/env node

/**
 * 修复数据库中文件名乱码问题
 * 将latin1编码的文件名转换为正确的UTF-8编码
 */

const { getDatabase } = require('../config/database-sqlite');

async function fixFilenameEncoding() {
  console.log('🔧 开始修复数据库中的文件名乱码问题...');
  
  try {
    const db = getDatabase();
    
    // 查询所有文档记录
    const documents = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM documents', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`📄 找到 ${documents.length} 个文档记录`);
    
    let fixedCount = 0;
    
    for (const doc of documents) {
      try {
        // 检查文件名是否包含乱码字符
        const originalName = doc.original_name || doc.file_name;
        
        if (!originalName) continue;
        
        // 尝试修复编码
        let fixedName = originalName;
        
        // 检测是否是latin1编码的中文
        if (/[À-ÿ]/.test(originalName)) {
          try {
            // 将latin1编码的字符串转换为UTF-8
            fixedName = Buffer.from(originalName, 'latin1').toString('utf8');
            
            // 验证转换结果是否包含中文字符
            if (/[\u4e00-\u9fff]/.test(fixedName)) {
              console.log(`🔄 修复文件名: "${originalName}" -> "${fixedName}"`);
              
              // 更新数据库
              await new Promise((resolve, reject) => {
                const updateSql = `
                  UPDATE documents 
                  SET original_name = ?, file_name = ? 
                  WHERE id = ?
                `;
                
                db.run(updateSql, [fixedName, fixedName, doc.id], function(err) {
                  if (err) reject(err);
                  else resolve();
                });
              });
              
              fixedCount++;
            }
          } catch (error) {
            console.warn(`⚠️  无法修复文件名: ${originalName}`, error.message);
          }
        }
        
      } catch (error) {
        console.error(`❌ 处理文档 ${doc.id} 时出错:`, error);
      }
    }
    
    console.log(`✅ 修复完成！共修复了 ${fixedCount} 个文件名`);
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixFilenameEncoding().then(() => {
    console.log('🎉 文件名编码修复完成');
    process.exit(0);
  }).catch(error => {
    console.error('💥 修复失败:', error);
    process.exit(1);
  });
}

module.exports = { fixFilenameEncoding };
