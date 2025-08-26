"""
数据模型定义
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

class DocumentStatus(str, Enum):
    """文档状态枚举"""
    UPLOADED = "uploaded"
    PARSING = "parsing"
    PARSED = "parsed"
    FAILED = "failed"

class ParsingStatus(str, Enum):
    """解析状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# 请求模型
class DocumentUploadRequest(BaseModel):
    """文档上传请求"""
    user_id: str = Field(..., description="用户ID")
    application_id: Optional[str] = Field(None, description="申请ID")

class DocumentParseRequest(BaseModel):
    """文档解析请求"""
    document_id: int = Field(..., description="文档ID")
    force_reparse: bool = Field(False, description="是否强制重新解析")

class LLMAnalysisRequest(BaseModel):
    """LLM分析请求"""
    document_id: int = Field(..., description="文档ID")
    merchant_type: str = Field(..., description="商家类型")
    custom_prompt: Optional[str] = Field(None, description="自定义提示词")

# 响应模型
class DocumentUploadResponse(BaseModel):
    """文档上传响应"""
    id: int
    file_name: str
    original_name: str
    file_size: int
    file_type: str
    oss_url: str
    upload_time: datetime
    status: DocumentStatus

class DocumentInfo(BaseModel):
    """文档信息"""
    id: int
    user_id: str
    application_id: Optional[str]
    file_name: str
    original_name: str
    file_size: int
    file_type: str
    mime_type: str
    oss_url: str
    upload_time: datetime
    status: DocumentStatus
    error_message: Optional[str]

class ParsingResult(BaseModel):
    """解析结果"""
    id: int
    document_id: int
    parsed_content: str
    extracted_fields: Dict[str, Any]
    llm_suggestions: Dict[str, Any]
    parsing_status: ParsingStatus
    confidence_score: Optional[float]
    processing_duration: Optional[int]
    llm_model: Optional[str]

class AutoFillSuggestion(BaseModel):
    """自动填写建议"""
    field_name: str
    suggested_value: str
    confidence: float
    source: str  # "document" 或 "llm"

class LLMAnalysisResponse(BaseModel):
    """LLM分析响应"""
    document_id: int
    suggestions: List[AutoFillSuggestion]
    overall_confidence: float
    processing_time: float
    model_used: str

# 通用响应模型
class APIResponse(BaseModel):
    """通用API响应"""
    success: bool
    message: str
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    detail: Optional[str] = None
