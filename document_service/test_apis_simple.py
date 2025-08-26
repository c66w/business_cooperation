#!/usr/bin/env python3
"""
简化版测试脚本 - 使用 requests 库测试 start_service.py 所有接口
"""

import requests
import json
import os
import time

# 服务配置
BASE_URL = "http://localhost:8000"
TEST_FILES_DIR = "test_files"

class SimpleAPITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.test_results = []
        
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
        if response_data and isinstance(response_data, dict):
            print(f"   响应: {json.dumps(response_data, ensure_ascii=False, indent=2)}")
        print("-" * 50)
    
    def test_health_endpoints(self):
        """测试健康检查接口"""
        print("🔍 测试健康检查接口...")
        
        # 测试根路径
        try:
            response = requests.get(f"{self.base_url}/")
            data = response.json()
            self.log_result("GET /", response.status_code == 200, data)
        except Exception as e:
            self.log_result("GET /", False, error=e)
        
        # 测试健康检查
        try:
            response = requests.get(f"{self.base_url}/health")
            data = response.json()
            self.log_result("GET /health", response.status_code == 200, data)
        except Exception as e:
            self.log_result("GET /health", False, error=e)
    
    def test_document_upload(self):
        """测试文档上传接口"""
        print("📄 测试文档上传接口...")
        
        # 创建测试文件
        test_content = """
        测试商家申请文档
        
        公司信息：
        公司名称：测试科技有限公司
        联系人：测试经理
        联系电话：13800000000
        邮箱：test@example.com
        
        产品信息：
        产品类别：智能硬件
        具体产品：智能音箱、智能手表
        年产能：100万台
        自有品牌：TestBrand
        
        合作需求：
        1. 直播带货合作
        2. 品牌推广合作
        3. 渠道分销合作
        
        公司资质：
        注册资本：500万元
        成立时间：2020年1月
        """
        
        # 确保测试文件目录存在
        os.makedirs(TEST_FILES_DIR, exist_ok=True)
        test_file_path = f"{TEST_FILES_DIR}/test_document.txt"
        
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        
        try:
            # 准备文件上传数据
            files = {'file': ('test_document.txt', open(test_file_path, 'rb'), 'text/plain')}
            data = {
                'user_id': 'test_user_123',
                'application_id': 'app_456'
            }
            
            response = requests.post(f"{self.base_url}/api/document/upload", files=files, data=data)
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/document/upload", success, response_data)
            
            # 关闭文件
            files['file'][1].close()
            
            # 返回文档ID和文件路径用于后续测试
            if success:
                return response_data["data"]["document_id"], response_data["data"]["file_path"]
                
        except Exception as e:
            self.log_result("POST /api/document/upload", False, error=e)
        
        return None, None
    
    def test_document_parsing(self, document_id, file_path):
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
            
            response = requests.post(
                f"{self.base_url}/api/parsing/parse",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/parsing/parse", success, response_data)
            
            if success:
                return response_data["data"]["parsed_content"]
                
        except Exception as e:
            self.log_result("POST /api/parsing/parse", False, error=e)
        
        return None
    
    def test_llm_basic_analysis(self):
        """测试基础信息LLM分析接口"""
        print("🤖 测试基础信息LLM分析接口...")

        try:
            request_data = {
                "documents": [
                    {
                        "name": "test_document.txt",
                        "url": "http://example.com/test.txt",
                        "type": "text/plain",
                        "size": 1024
                    }
                ],
                "currentData": {
                    "company_name": "测试科技有限公司"
                }
            }

            response = requests.post(
                f"{self.base_url}/api/llm/analyze/basic",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/llm/analyze/basic", success, response_data)

        except Exception as e:
            self.log_result("POST /api/llm/analyze/basic", False, error=e)

    def test_llm_detailed_analysis(self, merchant_type="factory"):
        """测试详细信息LLM分析接口"""
        print(f"🤖 测试详细信息LLM分析接口 (商家类型: {merchant_type})...")

        try:
            request_data = {
                "documents": [
                    {
                        "name": "test_document.txt",
                        "url": "http://example.com/test.txt",
                        "type": "text/plain",
                        "size": 1024
                    }
                ],
                "currentData": {
                    "company_name": "测试科技有限公司",
                    "merchant_type": merchant_type
                },
                "merchantType": merchant_type
            }

            response = requests.post(
                f"{self.base_url}/api/llm/analyze/detailed",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result(f"POST /api/llm/analyze/detailed ({merchant_type})", success, response_data)

        except Exception as e:
            self.log_result(f"POST /api/llm/analyze/detailed ({merchant_type})", False, error=e)

    def test_merchant_type_detection(self):
        """测试商家类型检测接口"""
        print("🎯 测试商家类型检测接口...")

        try:
            request_data = {
                "documents": [
                    {
                        "name": "factory_document.txt",
                        "url": "http://example.com/factory.txt",
                        "type": "text/plain",
                        "size": 2048
                    }
                ],
                "content": """
                我们是一家专业的智能硬件生产工厂，拥有15年的制造经验。
                年生产能力达到500万台，主要从事智能音箱、智能手表等产品的生产制造。
                我们为多个知名品牌提供OEM代工服务，包括小米、华为等。
                工厂占地面积50000平方米，拥有10条自动化生产线。
                """
            }

            response = requests.post(
                f"{self.base_url}/api/llm/detect-merchant-type",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/llm/detect-merchant-type", success, response_data)

        except Exception as e:
            self.log_result("POST /api/llm/detect-merchant-type", False, error=e)

    def test_llm_analysis(self, document_id, merchant_type="factory"):
        """测试LLM分析接口 (兼容性接口)"""
        print(f"🤖 测试LLM分析接口 (兼容模式, 商家类型: {merchant_type})...")

        if not document_id:
            self.log_result(f"POST /api/llm/analyze ({merchant_type})", False, error="缺少文档ID")
            return

        try:
            request_data = {
                "document_id": document_id,
                "merchant_type": merchant_type
            }

            response = requests.post(
                f"{self.base_url}/api/llm/analyze",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result(f"POST /api/llm/analyze ({merchant_type})", success, response_data)

        except Exception as e:
            self.log_result(f"POST /api/llm/analyze ({merchant_type})", False, error=e)
    
    def test_document_process(self):
        """测试一键处理接口"""
        print("🚀 测试一键处理接口...")
        
        # 创建另一个测试文件用于一键处理
        test_content = """
        品牌商申请文档
        
        公司信息：
        公司名称：优质品牌有限公司
        联系人：品牌总监
        联系电话：13900000000
        
        品牌信息：
        自有品牌：SuperBrand
        品牌推广需求：直播带货
        品牌营销策略：社交媒体推广
        品牌知名度：区域知名品牌
        
        合作需求：
        品牌合作推广
        渠道拓展
        """
        
        test_file_path = f"{TEST_FILES_DIR}/brand_document.txt"
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        
        try:
            # 准备文件上传数据
            files = {'file': ('brand_document.txt', open(test_file_path, 'rb'), 'text/plain')}
            data = {
                'merchant_type': 'brand',
                'auto_detect_type': 'true',
                'application_id': 'app_789'
            }
            
            response = requests.post(f"{self.base_url}/api/document/process", files=files, data=data)
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/document/process", success, response_data)
            
            # 关闭文件
            files['file'][1].close()
            
        except Exception as e:
            self.log_result("POST /api/document/process", False, error=e)
    
    def test_document_process_auto_detect(self):
        """测试一键处理接口 - 自动检测商家类型"""
        print("🎯 测试一键处理接口 (自动检测商家类型)...")
        
        # 创建工厂类型的测试文件
        test_content = """
        工厂申请文档
        
        公司信息：
        公司名称：精密制造工厂
        联系人：生产经理
        
        生产信息：
        生产能力：年产500万件
        生产线：10条自动化生产线
        工厂面积：50000平方米
        代工服务：OEM/ODM
        制造经验：15年
        
        合作需求：
        代工生产合作
        产能输出
        """
        
        test_file_path = f"{TEST_FILES_DIR}/factory_document.txt"
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        
        try:
            # 不指定商家类型，让AI自动检测
            files = {'file': ('factory_document.txt', open(test_file_path, 'rb'), 'text/plain')}
            data = {
                'auto_detect_type': 'true',
                'application_id': 'app_auto_detect'
            }
            
            response = requests.post(f"{self.base_url}/api/document/process", files=files, data=data)
            response_data = response.json()
            success = response.status_code == 200 and response_data.get("success", False)
            self.log_result("POST /api/document/process (auto-detect)", success, response_data)
            
            # 关闭文件
            files['file'][1].close()
            
        except Exception as e:
            self.log_result("POST /api/document/process (auto-detect)", False, error=e)
    
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

def main():
    """主测试函数"""
    print("🧪 开始测试 start_service.py 所有接口")
    print("="*60)
    
    tester = SimpleAPITester()
    
    # 1. 测试健康检查接口
    tester.test_health_endpoints()
    
    # 2. 测试文档上传
    document_id, file_path = tester.test_document_upload()
    
    # 3. 测试文档解析
    tester.test_document_parsing(document_id, file_path)

    # 4. 测试新的LLM分析接口
    # 4.1 测试基础信息分析
    tester.test_llm_basic_analysis()

    # 4.2 测试详细信息分析 (测试不同商家类型)
    for merchant_type in ["factory", "brand", "agent", "dealer", "operator"]:
        tester.test_llm_detailed_analysis(merchant_type)

    # 4.3 测试商家类型检测
    tester.test_merchant_type_detection()

    # 4.4 测试兼容性LLM分析接口
    for merchant_type in ["factory", "brand", "agent"]:
        tester.test_llm_analysis(document_id, merchant_type)

    # 5. 测试一键处理 (指定商家类型)
    tester.test_document_process()

    # 6. 测试一键处理 (自动检测商家类型)
    tester.test_document_process_auto_detect()
    
    # 打印测试总结
    tester.print_summary()

if __name__ == "__main__":
    print("请确保 start_service.py 已经启动在 http://localhost:8000")
    print("启动命令: python start_service.py")
    print("依赖库: pip install requests")
    print()
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
