#!/bin/bash

echo "🚀 启动商家合作查看系统..."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装根目录依赖..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install && cd ..
fi

echo "✅ 依赖安装完成"
echo "🌟 启动开发服务器..."
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
echo ""

# 启动开发服务器
npm run dev
