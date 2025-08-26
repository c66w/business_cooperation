-- =============================================
-- 商家合作Agent & Workflow系统完整初始化脚本
-- 生成时间: 8/23/2025, 5:35:03 PM
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

-- =============================================
-- 商家合作Agent & Workflow系统数据库设计
-- =============================================

-- 1. 扩展现有的商家合作信息表
ALTER TABLE business_cooperation ADD COLUMN IF NOT EXISTS merchant_type ENUM('factory', 'brand', 'agent', 'dealer', 'operator') NOT NULL DEFAULT 'factory' COMMENT '商家类型';
ALTER TABLE business_cooperation ADD COLUMN IF NOT EXISTS status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested') NOT NULL DEFAULT 'draft' COMMENT '状态';
ALTER TABLE business_cooperation ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
ALTER TABLE business_cooperation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';
ALTER TABLE business_cooperation ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NULL COMMENT '提交时间';

-- 2. 商家详细信息表（基于商家类型的动态字段）
CREATE TABLE IF NOT EXISTS merchant_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    merchant_type ENUM('factory', 'brand', 'agent', 'dealer', 'operator') NOT NULL,
    field_name VARCHAR(100) NOT NULL COMMENT '字段名称',
    field_value TEXT COMMENT '字段值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_type (user_id, merchant_type),
    INDEX idx_field_name (field_name),
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
) COMMENT '商家详细信息表（动态字段存储）';

-- 3. 工作流任务表
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id VARCHAR(36) NOT NULL UNIQUE COMMENT '任务唯一标识',
    user_id VARCHAR(50) NOT NULL COMMENT '关联的商家用户ID',
    task_type ENUM('validation', 'review', 'approval') NOT NULL COMMENT '任务类型',
    status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    assigned_to VARCHAR(100) COMMENT '分配给的处理人',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    title VARCHAR(200) NOT NULL COMMENT '任务标题',
    description TEXT COMMENT '任务描述',
    metadata JSON COMMENT '任务元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL COMMENT '开始处理时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    due_date TIMESTAMP NULL COMMENT '截止时间',
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_task_type (task_type),
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
) COMMENT '工作流任务表';

-- 4. 工作流历史记录表
CREATE TABLE IF NOT EXISTS workflow_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    task_id VARCHAR(36) COMMENT '关联的任务ID',
    action ENUM('created', 'submitted', 'assigned', 'reviewed', 'approved', 'rejected', 'modified', 'cancelled') NOT NULL,
    actor_type ENUM('system', 'merchant', 'reviewer', 'admin') NOT NULL,
    actor_id VARCHAR(100) COMMENT '操作者标识',
    actor_name VARCHAR(100) COMMENT '操作者姓名',
    from_status VARCHAR(50) COMMENT '原状态',
    to_status VARCHAR(50) COMMENT '新状态',
    comment TEXT COMMENT '操作备注',
    metadata JSON COMMENT '操作元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
) COMMENT '工作流历史记录表';

-- 5. 通知消息表
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL COMMENT '目标用户ID',
    recipient_type ENUM('merchant', 'reviewer', 'admin') NOT NULL,
    recipient_email VARCHAR(255) COMMENT '接收者邮箱',
    recipient_phone VARCHAR(20) COMMENT '接收者手机号',
    channel ENUM('email', 'sms', 'system', 'webhook') NOT NULL,
    template_name VARCHAR(100) NOT NULL COMMENT '通知模板名称',
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    variables JSON COMMENT '模板变量',
    status ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    error_message TEXT COMMENT '错误信息',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_channel (channel),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
) COMMENT '通知消息表';

-- 6. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT COMMENT '配置说明',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key),
    INDEX idx_is_active (is_active)
) COMMENT '系统配置表';

-- 7. 审核员信息表
CREATE TABLE IF NOT EXISTS reviewers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reviewer_id VARCHAR(50) NOT NULL UNIQUE COMMENT '审核员ID（花名）',
    name VARCHAR(100) NOT NULL COMMENT '审核员姓名',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) COMMENT '联系电话',
    department VARCHAR(100) COMMENT '部门',
    specialties JSON COMMENT '专业领域（商家类型、产品类别等）',
    max_concurrent_tasks INT DEFAULT 10 COMMENT '最大并发任务数',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reviewer_id (reviewer_id),
    INDEX idx_is_active (is_active),
    INDEX idx_email (email)
) COMMENT '审核员信息表';

-- 8. 商家类型字段定义表
CREATE TABLE IF NOT EXISTS merchant_type_fields (
    id INT PRIMARY KEY AUTO_INCREMENT,
    merchant_type ENUM('factory', 'brand', 'agent', 'dealer', 'operator') NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL COMMENT '字段显示名称',
    field_type ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'email', 'phone', 'file') NOT NULL,
    field_options JSON COMMENT '字段选项（用于select、radio、checkbox）',
    is_required BOOLEAN DEFAULT FALSE,
    validation_rules JSON COMMENT '验证规则',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_field (merchant_type, field_name),
    INDEX idx_merchant_type (merchant_type),
    INDEX idx_display_order (display_order)
) COMMENT '商家类型字段定义表';

-- 插入商家类型字段定义
INSERT INTO merchant_type_fields (merchant_type, field_name, field_label, field_type, is_required, display_order) VALUES
-- 工厂字段
('factory', 'own_brand', '自有品牌', 'text', FALSE, 1),
('factory', 'own_brand_operation_capability', '自有品牌运营能力', 'textarea', FALSE, 2),
('factory', 'oem_brands', '代工的知名品牌', 'textarea', FALSE, 3),
('factory', 'annual_production_capacity', '年生产规模（产能优势）', 'text', TRUE, 4),
('factory', 'need_mold_modification', '是否需要开模或修改包装', 'radio', FALSE, 5),
('factory', 'mold_modification_time', '预计开模或修改包装需要时间', 'text', FALSE, 6),
('factory', 'accept_deep_cooperation', '是否接受和遥望深度合作', 'radio', TRUE, 7),
('factory', 'accept_brand_co_creation', '是否接受品牌共创', 'radio', FALSE, 8),
('factory', 'accept_exclusive_authorization', '是否接受线上或全渠道的独家授权', 'radio', FALSE, 9),
('factory', 'accept_other_channel_authorization', '是否接受遥望授权其他渠道售卖', 'radio', FALSE, 10),
('factory', 'accept_channel_profit_sharing', '是否接受后续全渠道分红', 'radio', FALSE, 11),

-- 品牌商字段
('brand', 'brand_name', '品牌名称', 'text', TRUE, 1),
('brand', 'brand_awareness', '品牌知名度', 'textarea', FALSE, 2),
('brand', 'sales_data', '销售数据', 'textarea', TRUE, 3),
('brand', 'cooperation_budget', '合作预算', 'text', FALSE, 4),

-- 代理商字段
('agent', 'agent_brand_names', '代理的品牌名称', 'textarea', TRUE, 1),
('agent', 'brand_awareness', '品牌知名度', 'textarea', FALSE, 2),
('agent', 'sales_data', '销售数据', 'textarea', FALSE, 3),
('agent', 'cooperation_budget', '合作预算', 'text', FALSE, 4),

-- 经销商字段
('dealer', 'dealer_brand_names', '经销的品牌名称', 'textarea', TRUE, 1),
('dealer', 'brand_awareness', '品牌知名度', 'textarea', FALSE, 2),
('dealer', 'sales_data', '销售数据', 'textarea', FALSE, 3),
('dealer', 'cooperation_budget', '合作预算', 'text', FALSE, 4),

-- 代运营商字段
('operator', 'operated_brand_names', '代运营的品牌名称', 'textarea', TRUE, 1),
('operator', 'brand_awareness', '品牌知名度', 'textarea', FALSE, 2),
('operator', 'sales_data', '销售数据', 'textarea', TRUE, 3),
('operator', 'cooperation_budget', '合作预算', 'text', TRUE, 4)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('workflow.auto_assign_enabled', 'true', 'boolean', '是否启用自动任务分配'),
('workflow.default_review_timeout', '72', 'number', '默认审核超时时间（小时）'),
('notification.email_enabled', 'true', 'boolean', '是否启用邮件通知'),
('notification.sms_enabled', 'false', 'boolean', '是否启用短信通知'),
('validation.file_max_size', '10485760', 'number', '文件上传最大大小（字节）'),
('validation.allowed_file_types', '["pdf", "doc", "docx", "jpg", "jpeg", "png"]', 'json', '允许的文件类型'),
('form.merchant_types', '["factory", "brand", "agent", "dealer", "operator"]', 'json', '支持的商家类型'),
('validation.min_validation_score', '80', 'number', '最低验证分数要求')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 创建视图：商家完整信息视图
CREATE OR REPLACE VIEW merchant_full_info AS
SELECT 
    bc.*,
    GROUP_CONCAT(
        CONCAT(md.field_name, ':', md.field_value) 
        SEPARATOR ';'
    ) as dynamic_fields,
    COUNT(DISTINCT bqd.id) as document_count,
    wt.status as current_task_status,
    wt.assigned_to as current_reviewer
FROM business_cooperation bc
LEFT JOIN merchant_details md ON bc.user_id = md.user_id
LEFT JOIN business_qualification_document bqd ON bc.user_id = bqd.user_id
LEFT JOIN workflow_tasks wt ON bc.user_id = wt.user_id AND wt.status IN ('pending', 'in_progress')
GROUP BY bc.user_id;


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
