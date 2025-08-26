#!/usr/bin/env python3
"""
测试LLM连接
"""

import sys
import os
import asyncio

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.llm_service import llm_service

async def test_llm_connection():
    """测试LLM连接和基本功能"""
    try:
        print("🔍 测试LLM连接...")
        
        # 测试文档内容
        test_content = """
        公司名称：测试科技有限公司
        联系人：张三
        联系电话：13800138000
        邮箱：zhangsan@test.com
        注册资本：1000万元
        经营范围：软件开发、技术服务
        主要产品：企业管理软件
        """
        
        # 调用LLM分析
        result = await llm_service.analyze_document(
            content=test_content,
            merchant_type="factory"
        )
        
        if result["success"]:
            print("✅ LLM连接成功!")
            print(f"📊 处理时间: {result['processing_time']:.2f}秒")
            print(f"🎯 整体置信度: {result['overall_confidence']:.2f}")
            print(f"📝 提取字段数: {len(result['suggestions'])}")
            
            # 显示前3个建议
            for i, suggestion in enumerate(result['suggestions'][:3]):
                print(f"  {i+1}. {suggestion['field_name']}: {suggestion['suggested_value']} (置信度: {suggestion['confidence']:.2f})")
        else:
            print("❌ LLM分析失败:")
            print(f"错误: {result.get('error', '未知错误')}")
            
    except Exception as e:
        print(f"❌ LLM连接测试失败: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm_connection())
