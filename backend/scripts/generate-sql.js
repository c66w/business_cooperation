/**
 * 生成完整的数据库初始化SQL脚本
 * 用于手动执行数据库初始化
 */

const fs = require('fs');
const path = require('path');

function generateCompleteSQL() {
  console.log('🚀 生成完整的数据库初始化SQL脚本...\n');

  // 读取原始SQL文件
  const sqlFilePath = path.join(__dirname, '../../docs/database-schema.sql');
  let sqlContent = '';
  
  try {
    sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ 读取原始SQL文件成功');
  } catch (error) {
    console.error('❌ 读取SQL文件失败:', error.message);
    return;
  }

  // 添加数据库创建语句
  const completeSql = `-- =============================================
-- 商家合作Agent & Workflow系统完整初始化脚本
-- 生成时间: ${new Date().toLocaleString()}
-- =============================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS business_cooperation 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE business_cooperation;

-- 检查并创建原始表（如果不存在）
CREATE TABLE IF NOT EXISTS business_cooperation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    attendee_name VARCHAR(100) NOT NULL,
    contact_info VARCHAR(100) NOT NULL,
    attendee_job VARCHAR(100),
    industry_operator VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_company_name (company_name)
) COMMENT '商家合作基础信息表';

CREATE TABLE IF NOT EXISTS business_qualification_document (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_id VARCHAR(100),
    file_type VARCHAR(100),
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
) COMMENT '商家资质文档表';

${sqlContent}

-- 插入测试审核员数据
INSERT INTO reviewers (reviewer_id, name, email, department, specialties, max_concurrent_tasks, is_active)
VALUES 
('reviewer_001', '张审核', 'zhang.review@company.com', '商务部', '["factory", "brand"]', 10, TRUE),
('reviewer_002', '李审核', 'li.review@company.com', '运营部', '["agent", "dealer", "operator"]', 8, TRUE)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
email = VALUES(email),
department = VALUES(department),
specialties = VALUES(specialties),
max_concurrent_tasks = VALUES(max_concurrent_tasks);

-- 插入测试系统配置
INSERT INTO system_config (config_key, config_value, config_type, description, is_active) VALUES
('workflow.auto_assign_enabled', 'true', 'boolean', '是否启用自动任务分配', TRUE),
('workflow.default_review_timeout', '72', 'number', '默认审核超时时间（小时）', TRUE),
('notification.email_enabled', 'true', 'boolean', '是否启用邮件通知', TRUE),
('notification.sms_enabled', 'false', 'boolean', '是否启用短信通知', TRUE),
('validation.file_max_size', '10485760', 'number', '文件上传最大大小（字节）', TRUE),
('validation.allowed_file_types', '["pdf", "doc", "docx", "jpg", "jpeg", "png"]', 'json', '允许的文件类型', TRUE),
('form.merchant_types', '["factory", "brand", "agent", "dealer", "operator"]', 'json', '支持的商家类型', TRUE),
('validation.min_validation_score', '80', 'number', '最低验证分数要求', TRUE)
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
updated_at = CURRENT_TIMESTAMP;

-- 完成提示
SELECT '🎉 数据库初始化脚本生成完成！' as message;
SELECT '请在MySQL中执行此脚本来初始化数据库结构' as instruction;
`;

  // 保存完整SQL文件
  const outputPath = path.join(__dirname, '../database-init-complete.sql');
  
  try {
    fs.writeFileSync(outputPath, completeSql, 'utf8');
    console.log(`✅ 完整SQL脚本已生成: ${outputPath}`);
    console.log('\n📋 使用说明:');
    console.log('1. 确保MySQL服务器正在运行');
    console.log('2. 使用MySQL客户端执行以下命令:');
    console.log(`   mysql -u root -p < ${outputPath}`);
    console.log('3. 或者在MySQL Workbench中打开并执行该文件');
    console.log('\n🔧 数据库配置:');
    console.log('- 数据库名: business_cooperation');
    console.log('- 字符集: utf8mb4');
    console.log('- 排序规则: utf8mb4_unicode_ci');
  } catch (error) {
    console.error('❌ 保存SQL文件失败:', error.message);
  }
}

// 运行脚本
if (require.main === module) {
  generateCompleteSQL();
}

module.exports = { generateCompleteSQL };
