-- SQLite版本的文档处理表结构
-- 创建文档上传记录表
CREATE TABLE IF NOT EXISTS document_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    application_id TEXT,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    mime_type TEXT,
    oss_url TEXT NOT NULL,
    oss_key TEXT NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed')),
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建文档解析结果表
CREATE TABLE IF NOT EXISTS document_parsing_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    parsed_content TEXT,
    extracted_fields TEXT, -- JSON格式存储
    llm_suggestions TEXT, -- JSON格式存储
    parsing_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    parsing_status TEXT DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
    confidence_score REAL,
    processing_duration INTEGER,
    llm_model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document_uploads(id) ON DELETE CASCADE
);

-- 创建LLM分析结果表
CREATE TABLE IF NOT EXISTS document_llm_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    llm_suggestions TEXT, -- JSON格式存储
    confidence_score REAL,
    llm_model TEXT,
    processing_duration INTEGER,
    analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document_uploads(id) ON DELETE CASCADE
);

-- 创建智能填写历史表
CREATE TABLE IF NOT EXISTS auto_fill_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    document_id INTEGER NOT NULL,
    application_id TEXT,
    filled_fields TEXT, -- JSON格式存储
    user_modifications TEXT, -- JSON格式存储
    fill_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    acceptance_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document_uploads(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_document_uploads_user_id ON document_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_application_id ON document_uploads(application_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_upload_time ON document_uploads(upload_time);

CREATE INDEX IF NOT EXISTS idx_document_parsing_results_document_id ON document_parsing_results(document_id);
CREATE INDEX IF NOT EXISTS idx_document_parsing_results_parsing_status ON document_parsing_results(parsing_status);
CREATE INDEX IF NOT EXISTS idx_document_parsing_results_confidence_score ON document_parsing_results(confidence_score);

CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_document_id ON document_llm_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_confidence_score ON document_llm_analysis(confidence_score);
CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_analysis_time ON document_llm_analysis(analysis_time);

CREATE INDEX IF NOT EXISTS idx_auto_fill_history_user_id ON auto_fill_history(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_fill_history_document_id ON auto_fill_history(document_id);
CREATE INDEX IF NOT EXISTS idx_auto_fill_history_application_id ON auto_fill_history(application_id);
CREATE INDEX IF NOT EXISTS idx_auto_fill_history_fill_time ON auto_fill_history(fill_time);

-- 为business_cooperation表添加document_ids字段（如果不存在）
-- SQLite不支持ADD COLUMN IF NOT EXISTS，所以我们需要检查
PRAGMA table_info(business_cooperation);

-- 如果需要，手动添加字段：
-- ALTER TABLE business_cooperation ADD COLUMN document_ids TEXT;
