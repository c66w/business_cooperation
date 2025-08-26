"""
文档管理API路由
"""

import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from loguru import logger

from models.schemas import (
    DocumentUploadRequest, DocumentUploadResponse, DocumentInfo, APIResponse
)
from services.oss_service import oss_service
from config.settings import settings

router = APIRouter()

@router.post("/upload", response_model=APIResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    application_id: str = Form(None)
):
    """
    上传文档到OSS
    """
    try:
        # 验证文件类型
        file_ext = os.path.splitext(file.filename)[1][1:].lower()
        if file_ext not in settings.allowed_file_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {file_ext}"
            )
        
        # 验证文件大小
        file_content = await file.read()
        if len(file_content) > settings.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制: {settings.max_file_size} bytes"
            )
        
        # 生成文件存储键
        file_key = oss_service.generate_file_key(user_id, file.filename)
        
        # 上传到OSS
        upload_result = await oss_service.upload_file(file_content, file_key)
        
        if not upload_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"文件上传失败: {upload_result['error']}"
            )
        
        # TODO: 保存文档记录到数据库
        document_record = {
            "user_id": user_id,
            "application_id": application_id,
            "file_name": os.path.basename(file_key),
            "original_name": file.filename,
            "file_size": len(file_content),
            "file_type": file_ext,
            "mime_type": file.content_type,
            "oss_url": upload_result["oss_url"],
            "oss_key": file_key,
            "status": "uploaded"
        }
        
        logger.info(f"文档上传成功: {file.filename} -> {file_key}")
        
        return APIResponse(
            success=True,
            message="文档上传成功",
            data={
                "document_id": 1,  # TODO: 从数据库获取实际ID
                "oss_url": upload_result["oss_url"],
                "file_name": file.filename,
                "file_size": len(file_content)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文档上传异常: {e}")
        raise HTTPException(status_code=500, detail="文档上传失败")

@router.delete("/delete/{document_id}", response_model=APIResponse)
async def delete_document(document_id: int):
    """
    删除文档及其OSS文件
    """
    try:
        # TODO: 从数据库获取文档信息
        document_info = {
            "id": document_id,
            "oss_key": f"documents/user123/{document_id}_example.pdf",
            "file_name": "example.pdf"
        }

        # 从OSS删除文件
        delete_success = await oss_service.delete_file(document_info["oss_key"])

        if not delete_success:
            logger.warning(f"OSS文件删除失败，但继续删除数据库记录: {document_info['oss_key']}")

        # TODO: 从数据库删除文档记录
        # await database.execute("DELETE FROM documents WHERE id = ?", [document_id])

        logger.info(f"文档删除成功: {document_id}")

        return APIResponse(
            success=True,
            message="文档删除成功",
            data={
                "document_id": document_id,
                "oss_deleted": delete_success
            }
        )

    except Exception as e:
        logger.error(f"文档删除异常: {e}")
        raise HTTPException(status_code=500, detail="文档删除失败")

@router.get("/info/{document_id}", response_model=APIResponse)
async def get_document_info(document_id: int):
    """
    获取文档信息
    """
    try:
        # TODO: 从数据库获取文档信息
        document_info = {
            "id": document_id,
            "oss_key": f"documents/user123/{document_id}_example.pdf",
            "file_name": "example.pdf",
            "file_size": 1024000,
            "upload_time": "2024-01-01T00:00:00Z"
        }

        # 获取OSS文件信息
        oss_info = await oss_service.get_file_info(document_info["oss_key"])

        return APIResponse(
            success=True,
            message="获取文档信息成功",
            data={
                "document": document_info,
                "oss_info": oss_info
            }
        )

    except Exception as e:
        logger.error(f"获取文档信息异常: {e}")
        raise HTTPException(status_code=500, detail="获取文档信息失败")

@router.get("/list/{user_id}", response_model=APIResponse)
async def list_user_documents(user_id: str):
    """
    获取用户的文档列表
    """
    try:
        # TODO: 从数据库查询用户文档
        documents = [
            {
                "id": 1,
                "file_name": "example.pdf",
                "original_name": "商家资质文件.pdf",
                "file_size": 1024000,
                "file_type": "pdf",
                "oss_url": "https://example.com/doc1.pdf",
                "upload_time": "2024-01-01T10:00:00",
                "status": "parsed"
            }
        ]
        
        return APIResponse(
            success=True,
            message="获取文档列表成功",
            data=documents
        )
        
    except Exception as e:
        logger.error(f"获取文档列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取文档列表失败")

@router.delete("/{document_id}", response_model=APIResponse)
async def delete_document(document_id: int):
    """
    删除文档
    """
    try:
        # TODO: 从数据库获取文档信息
        # TODO: 删除OSS文件
        # TODO: 删除数据库记录
        
        return APIResponse(
            success=True,
            message="文档删除成功"
        )
        
    except Exception as e:
        logger.error(f"删除文档失败: {e}")
        raise HTTPException(status_code=500, detail="删除文档失败")

@router.get("/{document_id}/info", response_model=APIResponse)
async def get_document_info(document_id: int):
    """
    获取文档详细信息
    """
    try:
        # TODO: 从数据库查询文档信息
        document_info = {
            "id": document_id,
            "file_name": "example.pdf",
            "original_name": "商家资质文件.pdf",
            "file_size": 1024000,
            "file_type": "pdf",
            "oss_url": "https://example.com/doc1.pdf",
            "upload_time": "2024-01-01T10:00:00",
            "status": "parsed"
        }
        
        return APIResponse(
            success=True,
            message="获取文档信息成功",
            data=document_info
        )
        
    except Exception as e:
        logger.error(f"获取文档信息失败: {e}")
        raise HTTPException(status_code=500, detail="获取文档信息失败")
