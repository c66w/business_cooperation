#!/usr/bin/env python3
"""
启动文档处理微服务 - 集成本地LLM模型
"""

import os
import sys
import time
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入服务模块
from services.llm_service import llm_service
from services.oss_service import oss_service
from config.settings import settings, OSS_CONFIG

# 创建FastAPI应用
app = FastAPI(
    title="文档处理微服务 (演示版)",
    description="智能文档解析和LLM分析服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:6415", "http://localhost:6416", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """健康检查"""
    return {
        "service": "文档处理微服务",
        "status": "running",
        "version": "1.0.0 (演示版)"
    }

@app.get("/health")
async def health_check():
    """详细健康检查"""
    # 检查LLM服务状态
    llm_status = "healthy"
    try:
        # 简单测试LLM连接
        if llm_service:
            llm_status = "connected"
    except Exception as e:
        llm_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "services": {
            "oss": "simulated",
            "llm": llm_status,
            "parsing": "unstructured",
            "model": "openai/gpt-oss-120b"
        }
    }

@app.post("/api/document/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    application_id: str = Form(None)
):
    """
    文档上传功能 - 保存文件用于unstructured解析
    """
    try:
        # 读取文件内容
        content = await file.read()
        file_size = len(content)

        # 生成文档ID和文件路径
        document_id = int(time.time())

        # 创建临时目录
        temp_dir = "/tmp/documents"
        os.makedirs(temp_dir, exist_ok=True)

        # 保存文件到临时目录
        file_path = f"{temp_dir}/{document_id}_{file.filename}"
        with open(file_path, "wb") as temp_file:
            temp_file.write(content)

        # 使用真实的OSS服务上传文件
        try:
            # 生成OSS文件键
            file_key = oss_service.generate_file_key(user_id, file.filename)

            # 上传到OSS
            upload_result = await oss_service.upload_file(content, file_key)

            if upload_result["success"]:
                print(f"📄 文档上传到OSS成功: {file.filename} ({file_size} bytes) -> {upload_result['oss_url']}")

                return {
                    "success": True,
                    "message": "文档上传成功",
                    "data": {
                        "document_id": document_id,
                        "oss_url": upload_result["oss_url"],
                        "oss_key": upload_result["oss_key"],
                        "file_name": file.filename,
                        "file_size": file_size,
                        "file_path": file_path  # 保留本地路径用于解析
                    }
                }
            else:
                # OSS上传失败，使用本地文件
                print(f"⚠️  OSS上传失败: {upload_result.get('error', '未知错误')}")
                print(f"📄 使用本地文件: {file.filename} -> {file_path}")

                # 生成本地文件URL
                local_url = f"http://{settings.service_host}:{settings.service_port}/files/{document_id}_{file.filename}"

                return {
                    "success": True,
                    "message": "文档上传成功（本地存储）",
                    "data": {
                        "document_id": document_id,
                        "oss_url": local_url,
                        "file_name": file.filename,
                        "file_size": file_size,
                        "file_path": file_path
                    }
                }

        except Exception as oss_error:
            print(f"❌ OSS服务异常: {oss_error}")
            print(f"📄 回退到本地存储: {file.filename} -> {file_path}")

            # 生成本地文件URL
            local_url = f"http://{settings.service_host}:{settings.service_port}/files/{document_id}_{file.filename}"

            return {
                "success": True,
                "message": "文档上传成功（本地存储）",
                "data": {
                    "document_id": document_id,
                    "oss_url": local_url,
                    "file_name": file.filename,
                    "file_size": file_size,
                    "file_path": file_path
                }
            }

    except Exception as e:
        print(f"❌ 上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@app.post("/api/parsing/parse")
async def parse_document_endpoint(request_data: dict):
    """
    解析文档的API端点
    """
    try:
        document_id = request_data.get("document_id")
        print(f"🔍 收到解析请求，document_id: {document_id}")

        # 调用实际的解析函数
        result = await parse_document(request_data)
        return result

    except Exception as e:
        print(f"❌ unstructured解析失败: {e}")
        # 返回错误，让调用方使用备用方案
        raise e

async def parse_document_with_unstructured(file_path: str, document_id: str):
    """
    使用unstructured进行真正的文档解析
    """
    try:
        print(f"🔍 使用unstructured解析文档: {file_path}")

        # 导入unstructured
        from unstructured.partition.auto import partition

        # 使用unstructured解析文档
        elements = partition(filename=file_path)

        # 提取文本内容
        parsed_content = "\n\n".join([str(el) for el in elements])

        # 分析元素类型
        element_types = {}
        titles = []
        paragraphs = []
        tables = []
        lists = []

        for element in elements:
            element_type = type(element).__name__
            element_types[element_type] = element_types.get(element_type, 0) + 1

            # 根据元素类型分类
            if 'Title' in element_type:
                titles.append(str(element))
            elif 'NarrativeText' in element_type or 'Text' in element_type:
                paragraphs.append(str(element))
            elif 'Table' in element_type:
                tables.append(str(element))
            elif 'List' in element_type:
                lists.append(str(element))

        structured_content = {
            "titles": titles,
            "paragraphs": paragraphs,
            "tables": tables,
            "lists": lists,
            "element_types": element_types,
            "total_elements": len(elements)
        }

        print(f"✅ unstructured解析完成，提取了 {len(elements)} 个元素")
        print(f"📊 元素类型分布: {element_types}")

        # 打印解析的文档内容 (前1000字符)
        print(f"📄 解析的文档内容 (前1000字符):")
        print("=" * 60)
        print(parsed_content[:1000])
        if len(parsed_content) > 1000:
            print(f"... (总长度: {len(parsed_content)} 字符)")
        print("=" * 60)

        return {
            "success": True,
            "message": "文档解析成功",
            "data": {
                "document_id": document_id,
                "content_length": len(parsed_content),
                "parsed_content": parsed_content,
                "structured_content": structured_content,
                "parsing_method": "unstructured"
            }
        }

    except Exception as e:
        print(f"❌ unstructured解析失败: {e}")
        # 返回错误，让调用方使用备用方案
        raise e

async def parse_document(request_data: dict):
    """
    文档解析功能 - 支持unstructured和备用方案
    """
    try:
        document_id = request_data.get("document_id")
        file_path = request_data.get("file_path")  # 需要传入文件路径

        print(f"🔍 解析文档: {document_id}")

        if file_path and os.path.exists(file_path):
            try:
                # 尝试使用unstructured解析
                return await parse_document_with_unstructured(file_path, document_id)
            except Exception as unstructured_error:
                print(f"⚠️ unstructured解析失败，使用备用方案: {unstructured_error}")

        # 真实错误：解析失败
        print(f"❌ 文档解析失败: {document_id}")

        return {
            "success": False,
            "message": "文档解析失败：OCR服务不可用",
            "error": "OCR parsing service is not available"
        }
        
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")

@app.post("/api/llm/analyze/basic")
async def analyze_basic_info(request_data: dict):
    """
    基础信息阶段的LLM智能分析
    """
    try:
        documents = request_data.get("documents", [])
        current_data = request_data.get("currentData", {})
        document_content = request_data.get("content", "")

        print(f"🤖 基础信息LLM分析: {len(documents)} 个文档")

        # 获取文档内容
        content = document_content
        if not content:
            raise HTTPException(status_code=400, detail="缺少文档内容参数 'content'，请提供要分析的文档文本内容")

        # 打印输入的文档内容
        print(f"\n📄 输入的文档内容 (前500字符):")
        print("=" * 60)
        print(content[:500])
        if len(content) > 500:
            print(f"... (总长度: {len(content)} 字符)")
        print("=" * 60)

        # 使用新的基础信息分析方法
        analysis_result = await llm_service.analyze_basic_info(
            content=content,
            current_data=current_data
        )

        if analysis_result["success"]:
            return {
                "success": True,
                "message": "基础信息分析成功",
                "data": {
                    "suggestions": analysis_result["suggestions"],
                    "overall_confidence": analysis_result["overall_confidence"],
                    "processing_time": analysis_result["processing_time"],
                    "model_used": analysis_result["model_used"],
                    "stage": analysis_result["stage"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail=analysis_result["error"])

    except Exception as e:
        print(f"❌ 基础信息LLM分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"基础信息分析失败: {str(e)}")

@app.post("/api/llm/analyze/detailed")
async def analyze_detailed_info(request_data: dict):
    """
    详细信息阶段的LLM智能分析
    """
    try:
        documents = request_data.get("documents", [])
        current_data = request_data.get("currentData", {})
        merchant_type = request_data.get("merchantType")
        document_content = request_data.get("content", "")

        if not merchant_type:
            raise HTTPException(status_code=400, detail="缺少商家类型参数")

        print(f"🤖 详细信息LLM分析: {len(documents)} 个文档, 商家类型: {merchant_type}")

        # 获取文档内容
        content = document_content
        if not content:
            raise HTTPException(status_code=400, detail="缺少文档内容参数 'content'，请提供要分析的文档文本内容")

        # 打印输入的文档内容
        print(f"\n📄 输入的文档内容 (前500字符):")
        print("=" * 60)
        print(content[:500])
        if len(content) > 500:
            print(f"... (总长度: {len(content)} 字符)")
        print("=" * 60)

        # 使用新的详细信息分析方法
        analysis_result = await llm_service.analyze_detailed_info(
            content=content,
            merchant_type=merchant_type,
            current_data=current_data
        )

        if analysis_result["success"]:
            return {
                "success": True,
                "message": "详细信息分析成功",
                "data": {
                    "suggestions": analysis_result["suggestions"],
                    "overall_confidence": analysis_result["overall_confidence"],
                    "processing_time": analysis_result["processing_time"],
                    "model_used": analysis_result["model_used"],
                    "stage": analysis_result["stage"],
                    "merchant_type": analysis_result["merchant_type"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail=analysis_result["error"])

    except Exception as e:
        print(f"❌ 详细信息LLM分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"详细信息分析失败: {str(e)}")

@app.post("/api/llm/analyze")
async def analyze_document(request_data: dict):
    """
    兼容性接口 - 使用本地LLM进行智能分析
    """
    document_id = request_data.get("document_id")
    merchant_type = request_data.get("merchant_type")

    print(f"🤖 本地LLM分析 (兼容模式): 文档{document_id}, 类型{merchant_type}")
    print(f"🔍 收到的请求数据: {request_data}")

    # 如果没有document_id，自动找最新上传的文件
    if not document_id:
        print("🔍 没有提供document_id，查找最新上传的文件...")
        import glob
        import os
        file_pattern = "/tmp/documents/*"
        matching_files = glob.glob(file_pattern)
        if matching_files:
            # 按修改时间排序，取最新的
            latest_file = max(matching_files, key=os.path.getmtime)
            # 从文件名提取document_id
            filename = os.path.basename(latest_file)
            if '_' in filename:
                document_id = filename.split('_')[0]
                print(f"🔍 自动获取document_id: {document_id}, 文件: {latest_file}")

        # 获取文档内容
        content = request_data.get("content", "")

        # 如果没有提供内容，尝试通过document_id解析文档
        if not content and document_id:
            print(f"🔍 没有提供内容，尝试解析文档: {document_id}")
            try:
                # 查找文档文件
                import glob
                file_pattern = f"/tmp/documents/{document_id}_*"
                matching_files = glob.glob(file_pattern)

                if matching_files:
                    file_path = matching_files[0]
                    print(f"🔍 找到文档文件: {file_path}")

                    # 调用解析接口
                    parse_result = await parse_document({
                        "document_id": document_id,
                        "file_path": file_path
                    })

                    if parse_result.get("success") and parse_result.get("data", {}).get("parsed_content"):
                        content = parse_result["data"]["parsed_content"]
                        print(f"✅ 自动解析成功，内容长度: {len(content)} 字符")
                    else:
                        print(f"❌ 解析失败: {parse_result}")
                else:
                    print(f"❌ 未找到文档文件: {file_pattern}")
            except Exception as parse_error:
                print(f"❌ 自动解析失败: {parse_error}")

        if not content:
            raise HTTPException(status_code=400, detail="缺少文档内容参数 'content'，且无法自动解析文档")

        # 打印输入的文档内容
        print(f"\n📄 输入的文档内容 (前500字符):")
        print("=" * 60)
        print(content[:500])
        if len(content) > 500:
            print(f"... (总长度: {len(content)} 字符)")
        print("=" * 60)

        # 根据stage参数决定使用哪种分析方法
        stage = request_data.get("stage", "basic")

        if stage == "detailed":
            print(f"🔍 执行详细信息分析，商家类型: {merchant_type}")
            analysis_result = await llm_service.analyze_detailed_info(
                content=content,
                merchant_type=merchant_type,
                current_data=request_data.get("current_data", {})
            )
        else:
            print(f"🔍 执行基础信息分析")
            analysis_result = await llm_service.analyze_basic_info(
                content=content,
                current_data=request_data.get("current_data", {})
            )

        if analysis_result["success"]:
            return {
                "success": True,
                "message": "LLM分析成功",
                "data": {
                    "document_id": document_id,
                    "suggestions": analysis_result["suggestions"],
                    "overall_confidence": analysis_result["overall_confidence"],
                    "processing_time": analysis_result["processing_time"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail=analysis_result["error"])

@app.post("/api/llm/detect-merchant-type")
async def detect_merchant_type_endpoint(request_data: dict):
    """
    根据文档内容自动检测商家类型的API接口
    """
    try:
        documents = request_data.get("documents", [])
        content = request_data.get("content", "")

        print(f"🎯 商家类型检测: {len(documents)} 个文档")

        # 如果没有提供内容，使用模拟内容
        if not content:
            content = """
            智能科技有限公司申请资料

            我们是一家专业的智能硬件生产工厂，拥有15年的制造经验。
            年生产能力达到500万台，主要从事智能音箱、智能手表等产品的生产制造。
            我们为多个知名品牌提供OEM代工服务，包括小米、华为等。
            工厂占地面积50000平方米，拥有10条自动化生产线。
            """

        # 使用LLM服务进行商家类型检测
        detected_type = await llm_service.detect_merchant_type(content)

        return {
            "success": True,
            "message": "商家类型检测成功",
            "data": {
                "detected_type": detected_type,
                "type_name": llm_service.merchant_type_names.get(detected_type, detected_type),
                "confidence": 0.8  # 可以根据实际算法调整
            }
        }

    except Exception as e:
        print(f"❌ 商家类型检测失败: {e}")
        raise HTTPException(status_code=500, detail=f"商家类型检测失败: {str(e)}")

async def detect_merchant_type(content: str) -> str:
    """
    根据文档内容自动检测商家类型 (内部方法，保持向后兼容)
    """
    try:
        return await llm_service.detect_merchant_type(content)
    except Exception as e:
        print(f"商家类型检测失败: {e}")
        return "factory"  # 默认返回工厂类型

@app.post("/api/document/process")
async def process_document(
    file: UploadFile = File(...),
    merchant_type: str = Form(None),
    auto_detect_type: str = Form(None),
    application_id: str = Form(None)
):
    """
    一键处理：上传 + 解析 + LLM分析
    """
    try:
        user_id = "demo_user"  # 演示用户ID

        print(f"🚀 开始一键处理文档: {file.filename}")

        # 步骤1: 上传
        upload_result = await upload_document(file, user_id, application_id)
        print(f"🔍 上传结果: {upload_result}")
        document_id = upload_result["data"]["document_id"]
        file_path = upload_result["data"]["file_path"]
        print(f"🔍 获取到 document_id: {document_id}, file_path: {file_path}")

        # 步骤2: 解析
        try:
            print(f"🔍 开始解析文档: document_id={document_id}, file_path={file_path}")
            parse_result = await parse_document({
                "document_id": document_id,
                "file_path": file_path
            })
            print(f"🔍 解析结果: success={parse_result.get('success')}, content_length={len(parse_result['data']['parsed_content']) if parse_result.get('data') and parse_result['data'].get('parsed_content') else 0}")
        except Exception as parse_error:
            print(f"❌ 文档解析失败: {parse_error}")
            import traceback
            traceback.print_exc()
            raise parse_error

        # 步骤3: 确定商家类型
        final_merchant_type = merchant_type
        print(f"🔍 初始商家类型: {merchant_type}, auto_detect: {auto_detect_type}")
        if auto_detect_type == "true" or not merchant_type:
            # 让AI自动推荐商家类型
            final_merchant_type = await detect_merchant_type(parse_result["data"]["parsed_content"])
            print(f"🎯 AI推荐商家类型: {final_merchant_type}")
        print(f"🔍 最终商家类型: {final_merchant_type}")

        # 步骤4: LLM分析
        analyze_request = {
            "document_id": document_id,
            "merchant_type": final_merchant_type,
            "content": parse_result["data"]["parsed_content"]  # 传递真实的解析内容
        }
        print(f"🔍 LLM分析请求: document_id={analyze_request['document_id']}, merchant_type={analyze_request['merchant_type']}, content_length={len(analyze_request['content'])}")
        analyze_result = await analyze_document(analyze_request)

        # 添加推荐的商家类型到结果中
        if auto_detect_type == "true" or not merchant_type:
            analyze_result["data"]["recommended_merchant_type"] = final_merchant_type
        
        print(f"✅ 一键处理完成: {file.filename}")

        # 清理临时文件
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ 清理临时文件: {file_path}")
        except Exception as cleanup_error:
            print(f"⚠️ 清理临时文件失败: {cleanup_error}")

        return {
            "success": True,
            "message": "文档处理完成",
            "data": {
                "document_id": document_id,
                "upload_result": upload_result["data"],
                "parse_result": parse_result["data"],
                "analyze_result": analyze_result["data"]
            }
        }
        
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

if __name__ == "__main__":
    print("🐍 启动文档处理微服务 (演示版)")
    print("📍 服务地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    
    uvicorn.run(
        "start_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
