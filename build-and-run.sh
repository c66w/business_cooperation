#!/bin/bash

# 商家申请审核系统 - Docker构建和运行脚本

echo "🚀 开始构建商家申请审核系统..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装，请先安装docker-compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p data uploads tmp

# 停止并删除现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建镜像
echo "🔨 构建Docker镜像..."
docker-compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 显示日志
echo "📋 显示服务日志..."
docker-compose logs --tail=20

echo ""
echo "✅ 部署完成！"
echo "🌐 应用访问地址: http://localhost:3001"
echo "🔧 后端API地址: http://localhost:3001/api"
echo "🐍 Python服务地址: http://localhost:8000 (可选)"
echo ""
echo "📝 注意："
echo "  - 生产环境中，前端和后端API都通过端口3001提供服务"
echo "  - 前端页面: http://your-server-ip:3001"
echo "  - API接口: http://your-server-ip:3001/api"
echo ""
echo "📋 常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  进入容器: docker-compose exec business-cooperation bash"
