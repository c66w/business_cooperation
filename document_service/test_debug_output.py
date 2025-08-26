#!/usr/bin/env python3
"""
测试调试输出功能 - 验证文档内容、LLM输入输出的打印
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_basic_analysis_with_content():
    """测试基础信息分析 - 带真实内容"""
    print("🧪 测试基础信息分析 (带真实内容)...")
    
    test_content = """
    深圳市创新科技有限公司商家申请资料
    
    公司基本信息：
    公司名称：深圳市创新科技有限公司
    联系人：王总经理
    联系电话：13900000001
    联系邮箱：wang.ceo@innovation-tech.com
    公司地址：深圳市南山区高新技术产业园区
    
    产品信息：
    产品类别：3C数码家电
    具体产品：智能手机、平板电脑、智能穿戴设备
    主要品牌：InnoTech
    
    合作需求：
    我们希望通过遥望的直播平台，推广我们的智能产品系列，
    特别是新推出的智能手表和无线耳机产品。
    期望通过直播带货提升品牌知名度和销售业绩。
    
    公司实力：
    注册资本：2000万元
    成立时间：2019年5月
    员工人数：150人
    年营业额：8000万元
    """
    
    try:
        request_data = {
            "documents": [
                {
                    "name": "company_application.txt",
                    "url": "http://example.com/doc.txt",
                    "type": "text/plain",
                    "size": len(test_content)
                }
            ],
            "currentData": {
                "company_name": "创新科技"
            },
            "content": test_content
        }
        
        response = requests.post(
            f"{BASE_URL}/api/llm/analyze/basic",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 基础信息分析成功")
            print(f"提取字段数: {len(result['data']['suggestions'])}")
            print(f"整体置信度: {result['data']['overall_confidence']:.2f}")
            
            print("\n提取的字段:")
            for suggestion in result['data']['suggestions']:
                print(f"  - {suggestion['field_name']}: {suggestion['suggested_value']}")
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
    
    print("-" * 60)

def test_detailed_analysis_factory():
    """测试详细信息分析 - 工厂类型"""
    print("🧪 测试详细信息分析 (工厂类型)...")
    
    factory_content = """
    东莞精密制造工厂申请资料
    
    公司简介：
    我们是一家专业的电子产品制造工厂，成立于2010年，
    拥有13年的OEM/ODM制造经验，专注于智能硬件产品的生产。
    
    生产能力：
    工厂面积：80000平方米
    生产线数量：15条SMT生产线 + 8条组装线
    年生产能力：1000万台智能设备
    月产能：80万台
    
    品牌合作：
    自有品牌：TechMaster
    自有品牌运营能力：拥有完整的品牌运营团队，包括产品设计、
    市场推广、客服支持、物流配送等全链条服务能力。
    
    代工合作品牌：
    - 小米生态链产品（智能音箱、路由器）
    - 华为配件产品（充电器、数据线）
    - OPPO手机配件
    - vivo智能穿戴设备
    
    合作意愿：
    接受品牌共创：是，愿意与遥望共同打造新品牌
    接受深度合作：是，可以提供独家产品定制
    接受线上独家：是，可以为遥望平台提供独家产品
    接受遥望授权：是，同意遥望授权给其他渠道销售
    接受全渠道分红：是，愿意参与全渠道利润分成
    
    开模能力：
    是否需要开模：是，可以根据需求开发新模具
    预计开模时间：45天（包括设计、制作、测试）
    开模成本：根据产品复杂度，一般在10-50万元
    """
    
    try:
        request_data = {
            "documents": [
                {
                    "name": "factory_application.txt",
                    "url": "http://example.com/factory.txt",
                    "type": "text/plain",
                    "size": len(factory_content)
                }
            ],
            "currentData": {
                "company_name": "东莞精密制造工厂",
                "merchant_type": "factory"
            },
            "merchantType": "factory",
            "content": factory_content
        }
        
        response = requests.post(
            f"{BASE_URL}/api/llm/analyze/detailed",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 详细信息分析成功")
            print(f"提取字段数: {len(result['data']['suggestions'])}")
            print(f"整体置信度: {result['data']['overall_confidence']:.2f}")
            
            print("\n提取的字段:")
            for suggestion in result['data']['suggestions']:
                print(f"  - {suggestion['field_name']}: {suggestion['suggested_value']}")
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
    
    print("-" * 60)

def test_merchant_type_detection():
    """测试商家类型检测"""
    print("🧪 测试商家类型检测...")
    
    brand_content = """
    SuperBrand品牌运营公司申请资料
    
    品牌介绍：
    SuperBrand是国内知名的智能穿戴品牌，专注于智能手表、
    智能手环、无线耳机等产品的研发和销售。
    
    品牌实力：
    品牌知名度：在智能穿戴领域排名前10
    品牌价值：经第三方评估，品牌价值达到5亿元
    用户群体：主要面向25-40岁的都市白领
    
    销售数据：
    天猫旗舰店：年销售额1.2亿元，粉丝数80万
    京东自营：年销售额8000万元
    抖音小店：年销售额3000万元
    线下门店：全国200家，年销售额5000万元
    
    营销投入：
    年度品牌推广预算：2000万元
    直播带货预算：500万元
    KOL合作预算：300万元
    广告投放预算：1200万元
    
    合作期望：
    希望通过遥望的头部主播资源，提升品牌在年轻用户群体中的影响力，
    特别是在智能穿戴和时尚科技领域的品牌认知度。
    """
    
    try:
        request_data = {
            "documents": [
                {
                    "name": "brand_application.txt",
                    "url": "http://example.com/brand.txt",
                    "type": "text/plain",
                    "size": len(brand_content)
                }
            ],
            "content": brand_content
        }
        
        response = requests.post(
            f"{BASE_URL}/api/llm/detect-merchant-type",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 商家类型检测成功")
            print(f"检测结果: {result['data']['detected_type']} ({result['data']['type_name']})")
            print(f"置信度: {result['data']['confidence']}")
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
    
    print("-" * 60)

def main():
    """主测试函数"""
    print("🧪 开始测试调试输出功能")
    print("="*60)
    print("注意：请确保 start_service.py 已经在 http://localhost:8000 运行")
    print("="*60)
    
    # 等待用户确认
    input("按回车键开始测试...")
    
    # 1. 测试基础信息分析
    test_basic_analysis_with_content()
    
    # 2. 测试详细信息分析
    test_detailed_analysis_factory()
    
    # 3. 测试商家类型检测
    test_merchant_type_detection()
    
    print("✅ 所有测试完成")
    print("\n📝 检查控制台输出，应该能看到：")
    print("  1. 📄 输入的文档内容")
    print("  2. 🤖 LLM输入提示词")
    print("  3. 🤖 LLM原始响应")
    print("  4. 📋 解析结果")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"\n测试失败: {e}")
