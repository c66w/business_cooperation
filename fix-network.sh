#!/bin/bash

# 网络连接修复脚本
echo "🔧 诊断和修复网络连接问题..."

# 检查端口占用
echo "📊 检查端口占用情况:"
echo "端口 3001 (Node.js后端):"
lsof -i :3001 || echo "  ❌ 端口3001未被占用"

echo "端口 8000 (Python微服务):"
lsof -i :8000 || echo "  ❌ 端口8000未被占用"

echo "端口 6415 (React前端):"
lsof -i :6415 || echo "  ❌ 端口6415未被占用"

echo ""
echo "🚀 启动测试后端服务器..."

# 启动简单的测试后端
node test-backend.js &
BACKEND_PID=$!

echo "测试后端 PID: $BACKEND_PID"
echo "等待服务启动..."
sleep 3

# 测试连接
echo ""
echo "🔍 测试API连接:"
curl -s http://localhost:3001/health && echo "" || echo "❌ 健康检查失败"

echo ""
echo "🔍 测试登录API:"
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' && echo "" || echo "❌ 登录API失败"

echo ""
echo "✅ 测试后端已启动，PID: $BACKEND_PID"
echo "💡 现在可以测试前端登录功能"
echo "🛑 停止测试后端: kill $BACKEND_PID"
