"""
文档解析API路由
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from models.schemas import DocumentParseRequest, APIResponse
from services.parsing_service import parsing_service
from services.oss_service import oss_service

router = APIRouter()

@router.post("/parse", response_model=APIResponse)
async def parse_document(request: DocumentParseRequest):
    """
    解析文档内容
    """
    try:
        # TODO: 从数据库获取文档信息
        document_info = {
            "id": request.document_id,
            "oss_key": "documents/user123/example.pdf",
            "file_type": "pdf",
            "original_name": "商家资质.pdf"
        }
        
        # 从OSS下载文件
        success, file_content = await oss_service.download_file(document_info["oss_key"])
        if not success:
            raise HTTPException(status_code=404, detail="文档文件不存在")
        
        # 解析文档
        parse_result = await parsing_service.parse_document(
            file_content=file_content,
            file_type=document_info["file_type"],
            filename=document_info["original_name"]
        )
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"文档解析失败: {parse_result['error']}"
            )
        
        # TODO: 保存解析结果到数据库
        parsing_record = {
            "document_id": request.document_id,
            "parsed_content": parse_result["raw_content"],
            "structured_content": parse_result["structured_content"],
            "parsing_status": "completed"
        }
        
        logger.info(f"文档解析成功: document_id={request.document_id}")
        
        return APIResponse(
            success=True,
            message="文档解析成功",
            data={
                "document_id": request.document_id,
                "content_length": parse_result["content_length"],
                "file_type": parse_result["file_type"],
                "parsed_content": parse_result["raw_content"][:500] + "..." if len(parse_result["raw_content"]) > 500 else parse_result["raw_content"],
                "structured_content": parse_result["structured_content"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文档解析异常: {e}")
        raise HTTPException(status_code=500, detail="文档解析失败")

@router.get("/{document_id}/result", response_model=APIResponse)
async def get_parsing_result(document_id: int):
    """
    获取文档解析结果
    """
    try:
        # TODO: 从数据库查询解析结果
        parsing_result = {
            "id": 1,
            "document_id": document_id,
            "parsed_content": "这是解析后的文档内容...",
            "structured_content": {
                "titles": ["公司简介", "产品介绍"],
                "paragraphs": ["段落1内容", "段落2内容"],
                "tables": [],
                "lists": []
            },
            "parsing_status": "completed",
            "processing_duration": 15
        }
        
        return APIResponse(
            success=True,
            message="获取解析结果成功",
            data=parsing_result
        )
        
    except Exception as e:
        logger.error(f"获取解析结果失败: {e}")
        raise HTTPException(status_code=500, detail="获取解析结果失败")

@router.post("/{document_id}/reparse", response_model=APIResponse)
async def reparse_document(document_id: int):
    """
    重新解析文档
    """
    try:
        # 创建解析请求
        request = DocumentParseRequest(document_id=document_id, force_reparse=True)
        
        # 调用解析接口
        return await parse_document(request)
        
    except Exception as e:
        logger.error(f"重新解析文档失败: {e}")
        raise HTTPException(status_code=500, detail="重新解析文档失败")
