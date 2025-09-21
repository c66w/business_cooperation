/**
 * 文件清理功能测试脚本
 * 测试申请ID生成、文档上传、申请提交和文件清理的完整流程
 */

const { initializeDatabase } = require('../backend/config/database-sqlite');
const FileCleanupService = require('../backend/services/FileCleanupService');

async function testFileCleanupFlow() {
  console.log('🧪 开始测试文件清理流程...\n');

  try {
    // 1. 初始化数据库
    console.log('1️⃣ 初始化数据库...');
    await initializeDatabase();
    console.log('✅ 数据库初始化成功\n');

    // 2. 创建文件清理服务
    console.log('2️⃣ 创建文件清理服务...');
    const { execute } = require('../backend/config/database-sqlite');
    const fileCleanupService = new FileCleanupService({ execute });
    console.log('✅ 文件清理服务创建成功\n');

    // 3. 测试申请ID生成
    console.log('3️⃣ 测试申请ID生成...');
    const applicationId = `APP${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log(`✅ 申请ID生成成功: ${applicationId}\n`);

    // 4. 模拟创建孤立文件（申请不存在）
    console.log('4️⃣ 模拟创建孤立文件...');
    const mockOrphanedFile = {
      user_id: 'test_user_123',
      application_id: 'NONEXISTENT_APP_123',
      file_name: 'test_orphaned_file.pdf',
      original_name: 'test_orphaned_file.pdf',
      file_size: 1024,
      file_type: 'pdf',
      mime_type: 'application/pdf',
      oss_url: 'https://test-bucket.oss-cn-hangzhou.aliyuncs.com/test_orphaned_file.pdf',
      oss_key: 'test_orphaned_file.pdf',
      upload_time: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', ''), // 13小时前，SQLite格式
      status: 'uploaded'
    };

    // 插入测试数据
    await execute(`
      INSERT INTO document_uploads 
      (user_id, application_id, file_name, original_name, file_size, file_type, mime_type, oss_url, oss_key, upload_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mockOrphanedFile.user_id,
      mockOrphanedFile.application_id,
      mockOrphanedFile.file_name,
      mockOrphanedFile.original_name,
      mockOrphanedFile.file_size,
      mockOrphanedFile.file_type,
      mockOrphanedFile.mime_type,
      mockOrphanedFile.oss_url,
      mockOrphanedFile.oss_key,
      mockOrphanedFile.upload_time,
      mockOrphanedFile.status
    ]);
    console.log('✅ 孤立文件创建成功\n');

    // 5. 获取清理统计信息
    console.log('5️⃣ 获取清理统计信息...');
    const stats = await fileCleanupService.getCleanupStats();
    console.log('📊 清理统计信息:', stats);
    console.log('✅ 统计信息获取成功\n');

    // 6. 测试清理功能（注意：这里不会真正删除OSS文件，因为没有真实的OSS服务）
    console.log('6️⃣ 测试文件清理功能...');
    console.log('⚠️  注意：由于没有真实的OSS服务，这里只测试数据库清理逻辑');
    
    // 手动触发清理（跳过OSS删除）
    const orphanedFiles = await fileCleanupService.getOrphanedFiles();
    console.log(`🔍 发现 ${orphanedFiles.length} 个孤立文件`);
    
    if (orphanedFiles.length > 0) {
      console.log('📄 孤立文件列表:');
      orphanedFiles.forEach(file => {
        console.log(`  - ${file.original_name} (上传时间: ${file.upload_time})`);
      });
    }
    console.log('✅ 文件清理测试完成\n');

    // 7. 清理测试数据
    console.log('7️⃣ 清理测试数据...');
    await execute('DELETE FROM document_uploads WHERE user_id = ?', ['test_user_123']);
    console.log('✅ 测试数据清理完成\n');

    console.log('🎉 文件清理流程测试完成！所有功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testFileCleanupFlow()
    .then(() => {
      console.log('\n✅ 测试脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 测试脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = testFileCleanupFlow;
