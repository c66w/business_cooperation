"""
配置管理模块
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """应用配置"""
    
    # 服务配置
    service_host: str = "0.0.0.0"
    service_port: int = 8000
    debug: bool = False
    
    # 数据库配置
    database_url: str = "sqlite:///./data/business_cooperation.db"
    
    # OSS配置
    oss_access_key_id: str = "your_access_key_id_here"
    oss_access_key_secret: str = "your_access_key_secret_here"
    oss_endpoint: str = "oss-cn-hangzhou.aliyuncs.com"
    oss_bucket_name: str = "your_bucket_name"
    oss_domain: str = "https://your_bucket_name.oss-cn-hangzhou.aliyuncs.com"
    oss_prefix: str = "documents/business-cooperation/"
    
    # LLM配置 - 本地模型
    openai_api_key: str = "aaa"
    openai_base_url: str = "http://118.25.85.143:6410/v1"
    llm_model: str = "openai/gpt-oss-120b"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2000
    
    # 文档处理配置
    max_file_size: int = 52428800  # 50MB
    allowed_file_types: List[str] = ["pdf", "doc", "docx", "xls", "xlsx", "txt"]
    parsing_timeout: int = 300  # 5分钟
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "logs/document_service.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# 创建全局配置实例
settings = Settings()

# OSS配置字典
OSS_CONFIG = {
    "access_key_id": settings.oss_access_key_id,
    "access_key_secret": settings.oss_access_key_secret,
    "endpoint": settings.oss_endpoint,
    "bucket_name": settings.oss_bucket_name,
    "domain": settings.oss_domain or f"https://{settings.oss_bucket_name}.{settings.oss_endpoint}",
    "prefix": settings.oss_prefix
}

# LLM配置字典
LLM_CONFIG = {
    "api_key": settings.openai_api_key,
    "base_url": settings.openai_base_url,
    "model": settings.llm_model,
    "temperature": settings.llm_temperature,
    "max_tokens": settings.llm_max_tokens
}
