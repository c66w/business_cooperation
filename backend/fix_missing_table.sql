-- 创建缺失的 document_llm_analysis 表
CREATE TABLE IF NOT EXISTS document_llm_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    llm_suggestions TEXT,
    confidence_score REAL,
    llm_model TEXT,
    processing_duration INTEGER,
    analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document_uploads(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_document_id ON document_llm_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_confidence_score ON document_llm_analysis(confidence_score);
CREATE INDEX IF NOT EXISTS idx_document_llm_analysis_analysis_time ON document_llm_analysis(analysis_time);
