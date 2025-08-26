#!/bin/bash

echo "🔍 测试文件上传修复..."

# 创建测试文件
echo "这是一个测试文档，包含公司信息。
公司名称：测试科技有限公司
注册资本：1000万元
经营范围：软件开发、技术服务
主要产品：企业管理软件
年产值：5000万元
员工人数：100人
生产线：3条
主要客户：大型企业" > test_document.txt

echo "1. 测试健康检查:"
curl -s http://localhost:3001/health && echo ""

echo ""
echo "2. 测试文档上传 (multipart/form-data):"
curl -v -X POST http://localhost:3001/api/document/process \
  -H "Authorization: Bearer demo-token" \
  -F "document=@test_document.txt" \
  -F "auto_detect_type=true" \
  2>&1 | head -20

echo ""
echo "3. 测试其他API (JSON):"
curl -s -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/document/list && echo ""

# 清理
rm -f test_document.txt

echo ""
echo "✅ 测试完成"
