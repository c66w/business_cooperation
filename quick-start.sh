#!/bin/bash

# 快速启动脚本 - 用于开发和测试
# 使用方法: ./quick-start.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 快速启动混合架构系统...${NC}"
echo ""

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 启动Python微服务
echo -e "${BLUE}🐍 启动Python微服务 (端口8000)...${NC}"
cd "$PROJECT_ROOT/document_service"
if [ -d "venv" ]; then
    source venv/bin/activate
    python start_service.py &
    PYTHON_PID=$!
    echo "Python微服务 PID: $PYTHON_PID"
    deactivate
else
    echo -e "${YELLOW}⚠️  虚拟环境不存在，使用系统Python...${NC}"
    python start_service.py &
    PYTHON_PID=$!
    echo "Python微服务 PID: $PYTHON_PID"
fi

cd "$PROJECT_ROOT"
sleep 2

# 启动Node.js后端
echo -e "${BLUE}🔧 启动Node.js后端 (端口3001)...${NC}"
cd "$PROJECT_ROOT"
node start_backend.js &
BACKEND_PID=$!
echo "Node.js后端 PID: $BACKEND_PID"

sleep 2

# 启动React前端
echo -e "${BLUE}📱 启动React前端 (端口6416)...${NC}"
cd "$PROJECT_ROOT/frontend"
PORT=6416 npm start &
FRONTEND_PID=$!
echo "React前端 PID: $FRONTEND_PID"

cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}🎉 混合架构系统启动完成！${NC}"
echo ""
echo -e "${BLUE}📋 服务信息:${NC}"
echo -e "  🐍 Python微服务: http://localhost:8000 (PID: $PYTHON_PID)"
echo -e "  🔧 Node.js后端: http://localhost:3001 (PID: $BACKEND_PID)"
echo -e "  📱 React前端: http://localhost:6416 (PID: $FRONTEND_PID)"
echo -e "  📖 API文档: http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}💡 停止服务:${NC}"
echo "  kill $PYTHON_PID $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${YELLOW}📋 或使用完整的daemon脚本:${NC}"
echo "  ./start-daemon.sh  # 完整启动"
echo "  ./stop-daemon.sh   # 停止所有服务"
echo "  ./status-daemon.sh # 查看状态"
echo ""

# 保存PID到文件，方便后续停止
echo "$PYTHON_PID" > /tmp/python_service.pid
echo "$BACKEND_PID" > /tmp/backend.pid  
echo "$FRONTEND_PID" > /tmp/frontend.pid

echo -e "${GREEN}✅ PID已保存到 /tmp/ 目录${NC}"
