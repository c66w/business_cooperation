#!/bin/bash

echo "🔍 测试文档处理API..."

# 测试健康检查
echo "1. 测试健康检查:"
curl -s http://localhost:8000/health && echo "" || echo "❌ 健康检查失败"

echo ""
echo "2. 测试文档处理API:"

# 创建测试文件
echo "这是一个测试公司的营业执照。公司名称：测试科技有限公司。主要从事软件开发和技术服务。年产值1000万元。拥有生产线3条。" > test_document.txt

# 测试文档处理API
curl -X POST http://localhost:8000/api/document/process \
  -F "file=@test_document.txt" \
  -F "auto_detect_type=true" \
  && echo "" || echo "❌ 文档处理API失败"

# 清理测试文件
rm -f test_document.txt

echo ""
echo "✅ API测试完成"
