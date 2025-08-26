/**
 * SQLite数据库初始化脚本
 * 创建所有必要的表结构和初始数据
 */

require('dotenv').config();
const { initializeDatabase, execute, tableExists, closeDatabase, getDatabaseInfo } = require('../config/database-sqlite');

/**
 * SQLite版本的数据库结构SQL
 */
const sqliteSchema = `
-- =============================================
-- 商家合作Agent & Workflow系统SQLite版本
-- =============================================

-- 1. 商家合作基础信息表
CREATE TABLE IF NOT EXISTS business_cooperation (
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
);

-- 2. 商家资质文档表
CREATE TABLE IF NOT EXISTS business_qualification_document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_id TEXT,
    file_type TEXT,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_qualification_document_user_id ON business_qualification_document(user_id);

-- 3. 商家详细信息表（动态字段存储）
CREATE TABLE IF NOT EXISTS merchant_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    merchant_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_details_user_type ON merchant_details(user_id, merchant_type);
CREATE INDEX IF NOT EXISTS idx_merchant_details_field_name ON merchant_details(field_name);

-- 4. 工作流任务表
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    task_type TEXT CHECK(task_type IN ('validation', 'review', 'approval')) NOT NULL,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    assigned_to TEXT,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT, -- JSON as TEXT in SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    due_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_user_id ON workflow_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_task_type ON workflow_tasks(task_type);

-- 5. 工作流历史记录表
CREATE TABLE IF NOT EXISTS workflow_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    task_id TEXT,
    action TEXT CHECK(action IN ('created', 'submitted', 'assigned', 'reviewed', 'approved', 'rejected', 'modified', 'cancelled')) NOT NULL,
    actor_type TEXT CHECK(actor_type IN ('system', 'merchant', 'reviewer', 'admin')) NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    from_status TEXT,
    to_status TEXT,
    comment TEXT,
    metadata TEXT, -- JSON as TEXT in SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_user_id ON workflow_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_task_id ON workflow_history(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_action ON workflow_history(action);
CREATE INDEX IF NOT EXISTS idx_workflow_history_created_at ON workflow_history(created_at);

-- 6. 通知消息表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    recipient_type TEXT CHECK(recipient_type IN ('merchant', 'reviewer', 'admin')) NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    channel TEXT CHECK(channel IN ('email', 'sms', 'system', 'webhook')) NOT NULL,
    template_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT, -- JSON as TEXT in SQLite
    status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
    sent_at DATETIME,
    delivered_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 7. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type TEXT CHECK(config_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_config_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_is_active ON system_config(is_active);

-- 8. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'merchant')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 9. 审核员信息表
CREATE TABLE IF NOT EXISTS reviewers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    specialties TEXT, -- JSON as TEXT in SQLite
    max_concurrent_tasks INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviewers_reviewer_id ON reviewers(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviewers_is_active ON reviewers(is_active);
CREATE INDEX IF NOT EXISTS idx_reviewers_email ON reviewers(email);

-- 10. 商家类型字段定义表
CREATE TABLE IF NOT EXISTS merchant_type_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_type TEXT CHECK(merchant_type IN ('factory', 'brand', 'agent', 'dealer', 'operator')) NOT NULL,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT CHECK(field_type IN ('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'email', 'phone', 'file')) NOT NULL,
    field_options TEXT, -- JSON as TEXT in SQLite
    is_required BOOLEAN DEFAULT 0,
    validation_rules TEXT, -- JSON as TEXT in SQLite
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_merchant_type_fields_merchant_type ON merchant_type_fields(merchant_type);
CREATE INDEX IF NOT EXISTS idx_merchant_type_fields_display_order ON merchant_type_fields(display_order);
`;

/**
 * 插入初始数据
 */
async function insertInitialData() {
  console.log('插入系统配置...');

  const systemConfigs = [
    ['workflow.auto_assign_enabled', 'true', 'boolean', '是否启用自动任务分配', 1],
    ['workflow.default_review_timeout', '72', 'number', '默认审核超时时间（小时）', 1],
    ['notification.email_enabled', 'true', 'boolean', '是否启用邮件通知', 1],
    ['notification.sms_enabled', 'false', 'boolean', '是否启用短信通知', 1],
    ['validation.file_max_size', '10485760', 'number', '文件上传最大大小（字节）', 1],
    ['validation.allowed_file_types', '["pdf", "doc", "docx", "jpg", "jpeg", "png"]', 'json', '允许的文件类型', 1],
    ['form.merchant_types', '["factory", "brand", "agent", "dealer", "operator"]', 'json', '支持的商家类型', 1],
    ['validation.min_validation_score', '80', 'number', '最低验证分数要求', 1]
  ];

  for (const config of systemConfigs) {
    try {
      await execute(`
        INSERT OR REPLACE INTO system_config
        (config_key, config_value, config_type, description, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, config);
    } catch (error) {
      console.error('插入系统配置失败:', error.message);
    }
  }

  console.log('插入默认用户数据...');

  // 需要先安装bcrypt: npm install bcrypt
  const bcrypt = require('bcrypt');
  const saltRounds = 10;

  const defaultUsers = [
    {
      user_id: 'admin_001',
      username: 'admin',
      password: 'admin123',
      name: '系统管理员',
      email: 'admin@company.com',
      role: 'admin'
    },
    {
      user_id: 'reviewer_001',
      username: 'reviewer1',
      password: 'reviewer123',
      name: '张审核',
      email: 'zhang.review@company.com',
      role: 'reviewer'
    },
    {
      user_id: 'reviewer_002',
      username: 'reviewer2',
      password: 'reviewer123',
      name: '李审核',
      email: 'li.review@company.com',
      role: 'reviewer'
    },
    {
      user_id: 'merchant_001',
      username: 'merchant1',
      password: 'merchant123',
      name: '测试商家',
      email: 'merchant@test.com',
      role: 'merchant'
    }
  ];

  for (const user of defaultUsers) {
    try {
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      await execute(`
        INSERT OR REPLACE INTO users
        (user_id, username, password_hash, name, email, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [user.user_id, user.username, passwordHash, user.name, user.email, user.role]);
      console.log(`✅ 创建用户: ${user.username} (${user.role})`);
    } catch (error) {
      console.error(`插入用户数据失败 (${user.username}):`, error.message);
    }
  }

  console.log('插入审核员数据...');

  const reviewers = [
    ['reviewer_001', '张审核', 'zhang.review@company.com', '商务部', '["factory", "brand"]', 10, 1],
    ['reviewer_002', '李审核', 'li.review@company.com', '运营部', '["agent", "dealer", "operator"]', 8, 1]
  ];

  for (const reviewer of reviewers) {
    try {
      await execute(`
        INSERT OR REPLACE INTO reviewers
        (reviewer_id, name, email, department, specialties, max_concurrent_tasks, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, reviewer);
    } catch (error) {
      console.error('插入审核员数据失败:', error.message);
    }
  }

  console.log('✅ 初始数据插入完成');
}

/**
 * 执行SQL语句（支持多条语句）
 */
async function executeSQLStatements(sqlContent) {
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

      // 如果是索引创建失败，继续执行
      if (error.message.includes('no such table') && statement.includes('CREATE INDEX')) {
        console.log('⚠️  索引创建失败，可能表还未创建，继续执行...');
        continue;
      }

      throw error;
    }
  }
}

/**
 * 创建所有表
 */
async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS business_cooperation (
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
    )`,

    `CREATE TABLE IF NOT EXISTS business_qualification_document (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_id TEXT,
      file_type TEXT,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS merchant_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      merchant_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS workflow_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      task_type TEXT CHECK(task_type IN ('validation', 'review', 'approval', 'manual_review')) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
      assigned_to TEXT,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      due_date DATETIME,
      FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS workflow_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      task_id TEXT,
      action TEXT CHECK(action IN ('created', 'submitted', 'assigned', 'reviewed', 'approved', 'rejected', 'modified', 'cancelled')) NOT NULL,
      actor_type TEXT CHECK(actor_type IN ('system', 'merchant', 'reviewer', 'admin')) NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      from_status TEXT,
      to_status TEXT,
      comment TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      recipient_type TEXT CHECK(recipient_type IN ('merchant', 'reviewer', 'admin')) NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      channel TEXT CHECK(channel IN ('email', 'sms', 'system', 'webhook')) NOT NULL,
      template_name TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT,
      status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
      sent_at DATETIME,
      delivered_at DATETIME,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES business_cooperation(user_id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT NOT NULL,
      config_type TEXT CHECK(config_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'merchant')),
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS reviewers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      department TEXT,
      specialties TEXT,
      max_concurrent_tasks INTEGER DEFAULT 10,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS merchant_type_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_type TEXT CHECK(merchant_type IN ('factory', 'brand', 'agent', 'dealer', 'operator')) NOT NULL,
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT CHECK(field_type IN ('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'email', 'phone', 'file')) NOT NULL,
      field_options TEXT,
      is_required BOOLEAN DEFAULT 0,
      validation_rules TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(merchant_type, field_name)
    )`
  ];

  for (let i = 0; i < tables.length; i++) {
    try {
      console.log(`创建表 ${i + 1}/${tables.length}...`);
      await execute(tables[i]);
      console.log(`✅ 表 ${i + 1} 创建成功`);
    } catch (error) {
      console.error(`❌ 表 ${i + 1} 创建失败:`, error.message);
      throw error;
    }
  }
}

/**
 * 创建所有索引
 */
async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_business_cooperation_user_id ON business_cooperation(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_business_cooperation_company_name ON business_cooperation(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_business_cooperation_status ON business_cooperation(status)',
    'CREATE INDEX IF NOT EXISTS idx_business_qualification_document_user_id ON business_qualification_document(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_merchant_details_user_type ON merchant_details(user_id, merchant_type)',
    'CREATE INDEX IF NOT EXISTS idx_merchant_details_field_name ON merchant_details(field_name)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_tasks_user_id ON workflow_tasks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_tasks_task_type ON workflow_tasks(task_type)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_user_id ON workflow_history(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_task_id ON workflow_history(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_action ON workflow_history(action)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_created_at ON workflow_history(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_system_config_config_key ON system_config(config_key)',
    'CREATE INDEX IF NOT EXISTS idx_system_config_is_active ON system_config(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_reviewers_reviewer_id ON reviewers(reviewer_id)',
    'CREATE INDEX IF NOT EXISTS idx_reviewers_is_active ON reviewers(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_reviewers_email ON reviewers(email)',
    'CREATE INDEX IF NOT EXISTS idx_merchant_type_fields_merchant_type ON merchant_type_fields(merchant_type)',
    'CREATE INDEX IF NOT EXISTS idx_merchant_type_fields_display_order ON merchant_type_fields(display_order)'
  ];

  for (let i = 0; i < indexes.length; i++) {
    try {
      console.log(`创建索引 ${i + 1}/${indexes.length}...`);
      await execute(indexes[i]);
      console.log(`✅ 索引 ${i + 1} 创建成功`);
    } catch (error) {
      console.error(`❌ 索引 ${i + 1} 创建失败:`, error.message);
      // 索引创建失败不影响整体流程
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
    'users',
    'reviewers',
    'merchant_type_fields'
  ];

  for (const table of tables) {
    const exists = await tableExists(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }
}

/**
 * 主初始化函数
 */
async function initializeSQLiteDatabase() {
  try {
    console.log('🚀 开始初始化SQLite数据库...\n');

    // 1. 初始化数据库连接
    console.log('📡 连接SQLite数据库...');
    await initializeDatabase();

    // 2. 检查现有表结构
    await checkExistingTables();

    // 3. 执行数据库结构创建
    console.log('\n⚙️  创建数据库表结构...');
    await createTables();

    // 4. 创建索引
    console.log('\n📊 创建数据库索引...');
    await createIndexes();

    // 5. 插入初始数据
    console.log('\n📝 插入初始数据...');
    await insertInitialData();

    // 5. 验证结果
    console.log('\n🔍 验证数据库结构...');
    await checkExistingTables();

    // 6. 显示数据库信息
    const dbInfo = await getDatabaseInfo();
    if (dbInfo) {
      console.log('\n📊 数据库信息:');
      console.log(`  类型: ${dbInfo.type}`);
      console.log(`  文件: ${dbInfo.filename}`);
      console.log(`  大小: ${(dbInfo.size / 1024).toFixed(2)} KB`);
      console.log(`  表数量: ${dbInfo.tables.length}`);
      console.log(`  表列表: ${dbInfo.tables.join(', ')}`);
    }

    console.log('\n🎉 SQLite数据库初始化完成！');

  } catch (error) {
    console.error('\n❌ SQLite数据库初始化失败:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeSQLiteDatabase()
    .then(() => {
      console.log('\n✅ 初始化成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 初始化失败:', error.message);
      process.exit(1);
    })
    .finally(() => {
      closeDatabase();
    });
}

module.exports = {
  initializeSQLiteDatabase,
  checkExistingTables
};
