#!/bin/bash

# 商业合作平台 - 启动所有服务脚本
# 启动Python文档服务、Node.js后端、React前端

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}🚀 启动商业合作平台所有服务...${NC}"
echo "=================================================="

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查系统依赖...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
    
    echo ""
}

# 停止现有服务
stop_existing_services() {
    echo -e "${YELLOW}🛑 停止现有服务...${NC}"
    
    # 停止Python服务
    pkill -f "python.*start_service.py" 2>/dev/null && echo -e "${GREEN}✅ 停止Python服务${NC}" || echo -e "${YELLOW}⚠️  Python服务未运行${NC}"
    
    # 停止Node.js后端
    pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}✅ 停止Node.js后端${NC}" || echo -e "${YELLOW}⚠️  Node.js后端未运行${NC}"
    
    # 停止React前端
    pkill -f "react-scripts" 2>/dev/null && echo -e "${GREEN}✅ 停止React前端${NC}" || echo -e "${YELLOW}⚠️  React前端未运行${NC}"
    
    # 等待进程完全停止
    sleep 2
    echo ""
}

# 启动Python文档服务
start_python_service() {
    echo -e "${BLUE}🐍 启动Python文档服务...${NC}"
    
    cd "$PROJECT_ROOT/document_service"
    
    # 检查Python依赖
    if ! python3 -c "import fastapi, uvicorn, oss2, loguru" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  安装Python依赖...${NC}"
        pip3 install -r requirements.txt
    fi
    
    # 后台启动Python服务
    nohup python3 start_service.py > ../logs/python_service.log 2>&1 &
    PYTHON_PID=$!
    
    echo -e "${GREEN}✅ Python服务启动成功 (PID: $PYTHON_PID)${NC}"
    echo "   📍 服务地址: http://localhost:8000"
    echo "   📖 API文档: http://localhost:8000/docs"
    echo "   📋 日志文件: logs/python_service.log"
    echo ""
    
    # 等待服务启动
    sleep 3
}

# 启动Node.js后端服务
start_backend_service() {
    echo -e "${BLUE}🔧 启动Node.js后端服务...${NC}"
    
    cd "$PROJECT_ROOT/backend"
    
    # 检查Node.js依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  安装Node.js依赖...${NC}"
        npm install
    fi
    
    # 后台启动后端服务
    nohup node server.js > ../logs/backend_service.log 2>&1 &
    BACKEND_PID=$!
    
    echo -e "${GREEN}✅ Node.js后端启动成功 (PID: $BACKEND_PID)${NC}"
    echo "   📍 API地址: http://localhost:3001/api"
    echo "   📋 日志文件: logs/backend_service.log"
    echo ""
    
    # 等待服务启动
    sleep 3
}

# 启动React前端服务
start_frontend_service() {
    echo -e "${BLUE}⚛️  启动React前端服务...${NC}"
    
    cd "$PROJECT_ROOT/frontend"
    
    # 检查React依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  安装React依赖...${NC}"
        npm install
    fi
    
    # 后台启动前端服务
    nohup npm start > ../logs/frontend_service.log 2>&1 &
    FRONTEND_PID=$!
    
    echo -e "${GREEN}✅ React前端启动成功 (PID: $FRONTEND_PID)${NC}"
    echo "   📍 前端地址: http://localhost:6415"
    echo "   📋 日志文件: logs/frontend_service.log"
    echo ""
    
    # 等待服务启动
    sleep 5
}

# 创建日志目录
create_log_directory() {
    mkdir -p "$PROJECT_ROOT/logs"
}

# 显示服务状态
show_service_status() {
    echo -e "${BLUE}📊 服务状态检查...${NC}"
    echo "=================================================="
    
    # 检查Python服务
    if pgrep -f "python.*start_service.py" > /dev/null; then
        echo -e "${GREEN}✅ Python服务: 运行中${NC}"
    else
        echo -e "${RED}❌ Python服务: 未运行${NC}"
    fi
    
    # 检查Node.js后端
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Node.js后端: 运行中${NC}"
    else
        echo -e "${RED}❌ Node.js后端: 未运行${NC}"
    fi
    
    # 检查React前端
    if pgrep -f "react-scripts" > /dev/null; then
        echo -e "${GREEN}✅ React前端: 运行中${NC}"
    else
        echo -e "${RED}❌ React前端: 未运行${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🌐 访问地址:${NC}"
    echo "   前端页面: http://localhost:6415"
    echo "   后端API:  http://localhost:3001/api"
    echo "   Python API: http://localhost:8000/docs"
    echo ""
    echo -e "${BLUE}📋 常用命令:${NC}"
    echo "   查看日志: tail -f logs/[service_name].log"
    echo "   停止服务: ./stop-all-services.sh"
    echo "   重启服务: ./stop-all-services.sh && ./start-all-services.sh"
}

# 主执行流程
main() {
    create_log_directory
    check_dependencies
    stop_existing_services
    start_python_service
    start_backend_service
    start_frontend_service
    show_service_status
    
    echo -e "${GREEN}🎉 所有服务启动完成！${NC}"
}

# 执行主函数
main
