"""
文档处理微服务主入口
提供文档上传、解析、LLM分析等功能
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from loguru import logger

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI(
    title="智能文档处理服务",
    description="商家申请文档智能解析和自动填写服务",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:6416"],  # React前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置日志
logger.add(
    "logs/document_service.log",
    rotation="1 day",
    retention="30 days",
    level=os.getenv("LOG_LEVEL", "INFO")
)

# 导入路由
from api.routes import document, parsing, llm

# 注册路由
app.include_router(document.router, prefix="/api/document", tags=["文档管理"])
app.include_router(parsing.router, prefix="/api/parsing", tags=["文档解析"])
app.include_router(llm.router, prefix="/api/llm", tags=["智能分析"])

@app.get("/")
async def root():
    """健康检查接口"""
    return {
        "service": "智能文档处理服务",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """详细健康检查"""
    return {
        "status": "healthy",
        "services": {
            "oss": "connected",
            "llm": "available",
            "parsing": "ready"
        }
    }

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "服务内部错误", "detail": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("SERVICE_HOST", "0.0.0.0"),
        port=int(os.getenv("SERVICE_PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
