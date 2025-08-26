#!/usr/bin/env python3
"""
测试 start_service.py 所有接口的测试脚本
"""

import asyncio
import aiohttp
import json
import os
import time
from pathlib import Path

# 服务配置
BASE_URL = "http://localhost:8000"
TEST_FILES_DIR = "test_files"

class APITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name, success, response_data=None, error=None):
        """记录测试结果"""
        result = {
            "test_name": test_name,
            "success": success,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "response_data": response_data,
            "error": str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ 成功" if success else "❌ 失败"
        print(f"{status} - {test_name}")
        if error:
            print(f"   错误: {error}")
        if response_data:
            print(f"   响应: {json.dumps(response_data, ensure_ascii=False, indent=2)}")
        print("-" * 50)
    
    async def test_health_endpoints(self):
        """测试健康检查接口"""
        print("🔍 测试健康检查接口...")
        
        # 测试根路径
        try:
            async with self.session.get(f"{self.base_url}/") as response:
                data = await response.json()
                self.log_result("GET /", response.status == 200, data)
        except Exception as e:
            self.log_result("GET /", False, error=e)
        
        # 测试健康检查
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                data = await response.json()
                self.log_result("GET /health", response.status == 200, data)
        except Exception as e:
            self.log_result("GET /health", False, error=e)
    
    async def test_document_upload(self):
        """测试文档上传接口"""
        print("📄 测试文档上传接口...")
        
        # 创建测试文件
        test_content = """
        测试商家申请文档
        
        公司信息：
        公司名称：测试科技有限公司
        联系人：测试经理
        联系电话：13800000000
        
        产品信息：
        产品类别：智能硬件
        年产能：100万台
        
        合作需求：
        直播带货合作
        品牌推广合作
        """
        
        # 确保测试文件目录存在
        os.makedirs(TEST_FILES_DIR, exist_ok=True)
        test_file_path = f"{TEST_FILES_DIR}/test_document.txt"
        
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        
        try:
            # 准备文件上传数据
            data = aiohttp.FormData()
            data.add_field('user_id', 'test_user_123')
            data.add_field('application_id', 'app_456')
            
            with open(test_file_path, 'rb') as f:
                data.add_field('file', f, filename='test_document.txt', content_type='text/plain')
                
                async with self.session.post(f"{self.base_url}/api/document/upload", data=data) as response:
                    response_data = await response.json()
                    success = response.status == 200 and response_data.get("success", False)
                    self.log_result("POST /api/document/upload", success, response_data)
                    
                    # 返回文档ID和文件路径用于后续测试
                    if success:
                        return response_data["data"]["document_id"], response_data["data"]["file_path"]
                    
        except Exception as e:
            self.log_result("POST /api/document/upload", False, error=e)
        
        return None, None
    
    async def test_document_parsing(self, document_id, file_path):
        """测试文档解析接口"""
        print("🔍 测试文档解析接口...")
        
        if not document_id or not file_path:
            self.log_result("POST /api/parsing/parse", False, error="缺少文档ID或文件路径")
            return None
        
        try:
            request_data = {
                "document_id": document_id,
                "file_path": file_path
            }
            
            async with self.session.post(
                f"{self.base_url}/api/parsing/parse",
                json=request_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                response_data = await response.json()
                success = response.status == 200 and response_data.get("success", False)
                self.log_result("POST /api/parsing/parse", success, response_data)
                
                if success:
                    return response_data["data"]["parsed_content"]
                    
        except Exception as e:
            self.log_result("POST /api/parsing/parse", False, error=e)
        
        return None
    
    async def test_llm_analysis(self, document_id, merchant_type="factory"):
        """测试LLM分析接口"""
        print("🤖 测试LLM分析接口...")
        
        if not document_id:
            self.log_result("POST /api/llm/analyze", False, error="缺少文档ID")
            return
        
        try:
            request_data = {
                "document_id": document_id,
                "merchant_type": merchant_type
            }
            
            async with self.session.post(
                f"{self.base_url}/api/llm/analyze",
                json=request_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                response_data = await response.json()
                success = response.status == 200 and response_data.get("success", False)
                self.log_result("POST /api/llm/analyze", success, response_data)
                
        except Exception as e:
            self.log_result("POST /api/llm/analyze", False, error=e)
    
    async def test_document_process(self):
        """测试一键处理接口"""
        print("🚀 测试一键处理接口...")
        
        # 创建另一个测试文件用于一键处理
        test_content = """
        品牌商申请文档
        
        公司信息：
        公司名称：优质品牌有限公司
        联系人：品牌总监
        
        品牌信息：
        自有品牌：SuperBrand
        品牌推广需求：直播带货
        品牌营销策略：社交媒体推广
        """
        
        test_file_path = f"{TEST_FILES_DIR}/brand_document.txt"
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        
        try:
            # 准备文件上传数据
            data = aiohttp.FormData()
            data.add_field('merchant_type', 'brand')
            data.add_field('auto_detect_type', 'true')
            data.add_field('application_id', 'app_789')
            
            with open(test_file_path, 'rb') as f:
                data.add_field('file', f, filename='brand_document.txt', content_type='text/plain')
                
                async with self.session.post(f"{self.base_url}/api/document/process", data=data) as response:
                    response_data = await response.json()
                    success = response.status == 200 and response_data.get("success", False)
                    self.log_result("POST /api/document/process", success, response_data)
                    
        except Exception as e:
            self.log_result("POST /api/document/process", False, error=e)
    
    def print_summary(self):
        """打印测试总结"""
        print("\n" + "="*60)
        print("📊 测试总结")
        print("="*60)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - successful_tests
        
        print(f"总测试数: {total_tests}")
        print(f"成功: {successful_tests} ✅")
        print(f"失败: {failed_tests} ❌")
        print(f"成功率: {(successful_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n失败的测试:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test_name']}: {result['error']}")
        
        print("\n" + "="*60)

async def main():
    """主测试函数"""
    print("🧪 开始测试 start_service.py 所有接口")
    print("="*60)
    
    async with APITester() as tester:
        # 1. 测试健康检查接口
        await tester.test_health_endpoints()
        
        # 2. 测试文档上传
        document_id, file_path = await tester.test_document_upload()
        
        # 3. 测试文档解析
        parsed_content = await tester.test_document_parsing(document_id, file_path)
        
        # 4. 测试LLM分析 (测试不同商家类型)
        for merchant_type in ["factory", "brand", "agent"]:
            await tester.test_llm_analysis(document_id, merchant_type)
        
        # 5. 测试一键处理
        await tester.test_document_process()
        
        # 打印测试总结
        tester.print_summary()

if __name__ == "__main__":
    print("请确保 start_service.py 已经启动在 http://localhost:8000")
    print("启动命令: python start_service.py")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
