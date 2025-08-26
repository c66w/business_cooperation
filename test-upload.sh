#!/bin/bash

echo "🔍 测试文档上传API..."

# 创建测试文件
echo "这是一个测试公司的营业执照。公司名称：测试科技有限公司。主要从事软件开发和技术服务。" > test_doc.txt

echo "1. 测试健康检查:"
curl -s http://localhost:3001/health && echo ""

echo ""
echo "2. 测试文档上传 (不带认证头):"
curl -X POST http://localhost:3001/api/document/process \
  -F "document=@test_doc.txt" \
  -F "auto_detect_type=true" \
  && echo ""

echo ""
echo "3. 测试文档上传 (带认证头):"
curl -X POST http://localhost:3001/api/document/process \
  -H "Authorization: Bearer demo-token" \
  -F "document=@test_doc.txt" \
  -F "auto_detect_type=true" \
  && echo ""

# 清理
rm -f test_doc.txt

echo ""
echo "✅ 测试完成"
