#!/bin/bash

echo "🔍 测试backend修复结果..."

# 测试1: 健康检查
echo "1. 测试健康检查:"
curl -s http://localhost:3001/health && echo "" || echo "❌ 健康检查失败"

# 测试2: 认证测试 - 文档列表
echo ""
echo "2. 测试认证 - 文档列表 (demo-token):"
curl -s -H "Authorization: Bearer demo-token" http://localhost:3001/api/document/list && echo "" || echo "❌ 认证失败"

# 测试3: 认证测试 - 文档列表 (test-token)
echo ""
echo "3. 测试认证 - 文档列表 (test-token):"
curl -s -H "Authorization: Bearer test-token-123" http://localhost:3001/api/document/list && echo "" || echo "❌ 认证失败"

# 测试4: 文件上传测试
echo ""
echo "4. 测试文件上传:"
echo "这是一个测试文档，包含公司信息。公司名称：测试科技有限公司。" > test_upload.txt

curl -s -X POST http://localhost:3001/api/document/process \
  -H "Authorization: Bearer demo-token" \
  -F "document=@test_upload.txt" \
  -F "auto_detect_type=true" \
  && echo "" || echo "❌ 文件上传失败"

# 清理
rm -f test_upload.txt

echo ""
echo "✅ 测试完成"
