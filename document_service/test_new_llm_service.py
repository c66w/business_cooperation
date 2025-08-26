#!/usr/bin/env python3
"""
测试新的LLM服务 - 分阶段、分商家类型的智能分析
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.llm_service import llm_service

async def test_basic_info_analysis():
    """测试基础信息分析"""
    print("🔍 测试基础信息分析...")
    
    content = """
    智能科技有限公司商家申请资料
    
    公司基本信息：
    公司名称：深圳市智能科技有限公司
    联系人：张经理
    联系电话：13800138000
    联系邮箱：zhang.manager@smarttech.com
    公司地址：深圳市南山区科技园
    
    产品信息：
    产品类别：3C数码家电
    具体产品：智能音箱、智能手表、智能家居设备
    
    合作需求：
    希望与遥望进行直播带货合作，提升品牌知名度
    """
    
    current_data = {
        "company_name": "智能科技"  # 部分已填写的数据
    }
    
    result = await llm_service.analyze_basic_info(content, current_data)
    
    print(f"分析结果: {result['success']}")
    if result['success']:
        print(f"提取字段数: {len(result['suggestions'])}")
        print(f"整体置信度: {result['overall_confidence']:.2f}")
        print(f"处理时间: {result['processing_time']:.2f}s")
        
        print("\n提取的字段:")
        for suggestion in result['suggestions']:
            print(f"  - {suggestion['field_name']}: {suggestion['suggested_value']} (置信度: {suggestion['confidence']:.2f})")
    else:
        print(f"分析失败: {result['error']}")
    
    print("-" * 60)

async def test_detailed_info_analysis():
    """测试详细信息分析 - 不同商家类型"""
    print("🔍 测试详细信息分析...")
    
    # 工厂类型的文档内容
    factory_content = """
    深圳智能制造工厂申请资料
    
    公司简介：
    我们是一家专业的智能硬件生产工厂，成立于2015年，拥有8年的制造经验。
    
    生产能力：
    年生产规模：500万台智能设备
    工厂面积：50000平方米
    生产线：10条自动化生产线
    
    品牌合作：
    自有品牌：SmartLife
    代工品牌：小米、华为、OPPO等知名品牌
    
    合作意愿：
    接受品牌共创：是
    接受深度合作：是
    接受线上独家：是
    接受遥望授权：是
    接受全渠道分红：是
    
    开模能力：
    可以开模，预计时间：30天
    """
    
    # 品牌商类型的文档内容
    brand_content = """
    优质品牌有限公司申请资料
    
    公司简介：
    我们是一家知名的消费电子品牌商，专注于智能穿戴设备。
    
    品牌信息：
    品牌名称：SuperWatch
    品牌知名度：在智能手表领域排名前5
    
    销售数据：
    天猫旗舰店年销售额：5000万元
    京东自营店年销售额：3000万元
    线下渠道销售额：2000万元
    
    营销预算：
    年度营销预算：1000万元
    直播带货预算：300万元
    """
    
    merchant_types = [
        ("factory", factory_content),
        ("brand", brand_content)
    ]
    
    for merchant_type, content in merchant_types:
        print(f"\n测试 {merchant_type} 类型分析:")
        
        current_data = {
            "company_name": "测试公司",
            "merchant_type": merchant_type
        }
        
        result = await llm_service.analyze_detailed_info(content, merchant_type, current_data)
        
        print(f"分析结果: {result['success']}")
        if result['success']:
            print(f"提取字段数: {len(result['suggestions'])}")
            print(f"整体置信度: {result['overall_confidence']:.2f}")
            print(f"处理时间: {result['processing_time']:.2f}s")
            
            print(f"\n{merchant_type} 类型提取的字段:")
            for suggestion in result['suggestions']:
                print(f"  - {suggestion['field_name']}: {suggestion['suggested_value']} (置信度: {suggestion['confidence']:.2f})")
        else:
            print(f"分析失败: {result['error']}")
        
        print("-" * 40)

async def test_merchant_type_detection():
    """测试商家类型检测"""
    print("🎯 测试商家类型检测...")
    
    test_contents = [
        ("工厂内容", """
        我们是一家专业的智能硬件生产工厂，拥有15年的制造经验。
        年生产能力达到500万台，主要从事智能音箱、智能手表等产品的生产制造。
        我们为多个知名品牌提供OEM代工服务，包括小米、华为等。
        工厂占地面积50000平方米，拥有10条自动化生产线。
        """),
        ("品牌商内容", """
        我们是SuperBrand品牌的运营方，专注于智能穿戴设备的品牌推广。
        品牌在市场上有很高的知名度，年销售额达到1亿元。
        我们希望通过直播带货提升品牌影响力，扩大市场份额。
        品牌营销预算充足，愿意投入更多资源进行品牌合作。
        """),
        ("代理商内容", """
        我们是多个知名品牌的代理商，拥有强大的渠道分销能力。
        代理品牌包括苹果、三星、华为等，在全国有200多个销售网点。
        我们希望通过遥望的直播平台，为代理品牌带来更多销量。
        具有丰富的渠道运营经验和完善的售后服务体系。
        """),
        ("代运营内容", """
        我们是专业的电商代运营公司，为多个品牌提供店铺运营服务。
        代运营品牌包括美妆、服装、数码等多个类别。
        团队具备专业的运营能力，包括店铺装修、客服、物流等全链条服务。
        希望通过遥望平台为客户品牌提供更好的运营效果。
        """)
    ]
    
    for content_type, content in test_contents:
        print(f"\n测试 {content_type}:")
        detected_type = await llm_service.detect_merchant_type(content)
        type_name = llm_service.merchant_type_names.get(detected_type, detected_type)
        print(f"检测结果: {detected_type} ({type_name})")
    
    print("-" * 60)

async def test_field_confidence_calculation():
    """测试字段置信度计算"""
    print("🧮 测试字段置信度计算...")
    
    test_cases = [
        ("contact_phone", "13800138000", {"type": "phone"}),
        ("contact_phone", "138001380", {"type": "phone"}),  # 错误格式
        ("contact_email", "test@example.com", {"type": "email"}),
        ("contact_email", "invalid-email", {"type": "email"}),  # 错误格式
        ("company_name", "深圳市智能科技有限公司", {"type": "text"}),
        ("company_name", "A", {"type": "text"}),  # 太短
        ("accept_deep_cooperation", "是", {"type": "radio"}),
        ("accept_deep_cooperation", "maybe", {"type": "radio"}),  # 无效选项
    ]
    
    for field_name, value, field_config in test_cases:
        confidence = llm_service._calculate_field_confidence(field_name, value, field_config)
        print(f"{field_name}: '{value}' -> 置信度: {confidence:.2f}")
    
    print("-" * 60)

async def main():
    """主测试函数"""
    print("🧪 开始测试新的LLM服务")
    print("="*60)
    
    try:
        # 1. 测试基础信息分析
        await test_basic_info_analysis()
        
        # 2. 测试详细信息分析
        await test_detailed_info_analysis()
        
        # 3. 测试商家类型检测
        await test_merchant_type_detection()
        
        # 4. 测试字段置信度计算
        await test_field_confidence_calculation()
        
        print("✅ 所有测试完成")
        
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔧 注意：此测试需要LLM服务正常运行")
    print("请确保config/settings.py中的LLM配置正确")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"\n测试启动失败: {e}")
