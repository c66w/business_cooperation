#!/bin/bash

# 商业合作平台 - 停止所有服务脚本
# 停止Python文档服务、Node.js后端、React前端

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 停止商业合作平台所有服务...${NC}"
echo "=================================================="

# 停止Python文档服务
stop_python_service() {
    echo -e "${BLUE}🐍 停止Python文档服务...${NC}"
    
    # 查找Python服务进程
    PYTHON_PIDS=$(pgrep -f "python.*start_service.py" 2>/dev/null)
    
    if [ -n "$PYTHON_PIDS" ]; then
        echo "   找到Python服务进程: $PYTHON_PIDS"
        kill $PYTHON_PIDS 2>/dev/null
        
        # 等待进程停止
        sleep 2
        
        # 检查是否还在运行
        if pgrep -f "python.*start_service.py" > /dev/null; then
            echo -e "${YELLOW}   ⚠️  强制停止Python服务...${NC}"
            pkill -9 -f "python.*start_service.py" 2>/dev/null
        fi
        
        echo -e "${GREEN}   ✅ Python服务已停止${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Python服务未运行${NC}"
    fi
    echo ""
}

# 停止Node.js后端服务
stop_backend_service() {
    echo -e "${BLUE}🔧 停止Node.js后端服务...${NC}"
    
    # 查找Node.js后端进程
    BACKEND_PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)
    
    if [ -n "$BACKEND_PIDS" ]; then
        echo "   找到Node.js后端进程: $BACKEND_PIDS"
        kill $BACKEND_PIDS 2>/dev/null
        
        # 等待进程停止
        sleep 2
        
        # 检查是否还在运行
        if pgrep -f "node.*server.js" > /dev/null; then
            echo -e "${YELLOW}   ⚠️  强制停止Node.js后端...${NC}"
            pkill -9 -f "node.*server.js" 2>/dev/null
        fi
        
        echo -e "${GREEN}   ✅ Node.js后端已停止${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Node.js后端未运行${NC}"
    fi
    echo ""
}

# 停止React前端服务
stop_frontend_service() {
    echo -e "${BLUE}⚛️  停止React前端服务...${NC}"
    
    # 查找React前端进程
    FRONTEND_PIDS=$(pgrep -f "react-scripts" 2>/dev/null)
    
    if [ -n "$FRONTEND_PIDS" ]; then
        echo "   找到React前端进程: $FRONTEND_PIDS"
        kill $FRONTEND_PIDS 2>/dev/null
        
        # 等待进程停止
        sleep 2
        
        # 检查是否还在运行
        if pgrep -f "react-scripts" > /dev/null; then
            echo -e "${YELLOW}   ⚠️  强制停止React前端...${NC}"
            pkill -9 -f "react-scripts" 2>/dev/null
        fi
        
        echo -e "${GREEN}   ✅ React前端已停止${NC}"
    else
        echo -e "${YELLOW}   ⚠️  React前端未运行${NC}"
    fi
    echo ""
}

# 停止其他相关进程
stop_related_processes() {
    echo -e "${BLUE}🧹 清理相关进程...${NC}"
    
    # 停止可能的npm进程
    NPM_PIDS=$(pgrep -f "npm.*start" 2>/dev/null)
    if [ -n "$NPM_PIDS" ]; then
        echo "   停止npm进程: $NPM_PIDS"
        kill $NPM_PIDS 2>/dev/null
        sleep 1
    fi
    
    # 停止可能的uvicorn进程
    UVICORN_PIDS=$(pgrep -f "uvicorn" 2>/dev/null)
    if [ -n "$UVICORN_PIDS" ]; then
        echo "   停止uvicorn进程: $UVICORN_PIDS"
        kill $UVICORN_PIDS 2>/dev/null
        sleep 1
    fi
    
    # 停止可能的webpack进程
    WEBPACK_PIDS=$(pgrep -f "webpack" 2>/dev/null)
    if [ -n "$WEBPACK_PIDS" ]; then
        echo "   停止webpack进程: $WEBPACK_PIDS"
        kill $WEBPACK_PIDS 2>/dev/null
        sleep 1
    fi
    
    echo -e "${GREEN}   ✅ 相关进程清理完成${NC}"
    echo ""
}

# 检查端口占用
check_ports() {
    echo -e "${BLUE}🔍 检查端口占用情况...${NC}"
    
    # 检查8000端口 (Python服务)
    if lsof -i :8000 > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠️  端口8000仍被占用${NC}"
        lsof -i :8000 | grep LISTEN
    else
        echo -e "${GREEN}   ✅ 端口8000已释放${NC}"
    fi
    
    # 检查3001端口 (Node.js后端)
    if lsof -i :3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠️  端口3001仍被占用${NC}"
        lsof -i :3001 | grep LISTEN
    else
        echo -e "${GREEN}   ✅ 端口3001已释放${NC}"
    fi
    
    # 检查6415端口 (React前端)
    if lsof -i :6415 > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠️  端口6415仍被占用${NC}"
        lsof -i :6415 | grep LISTEN
    else
        echo -e "${GREEN}   ✅ 端口6415已释放${NC}"
    fi
    
    echo ""
}

# 显示最终状态
show_final_status() {
    echo -e "${BLUE}📊 最终服务状态...${NC}"
    echo "=================================================="
    
    # 检查Python服务
    if pgrep -f "python.*start_service.py" > /dev/null; then
        echo -e "${RED}❌ Python服务: 仍在运行${NC}"
    else
        echo -e "${GREEN}✅ Python服务: 已停止${NC}"
    fi
    
    # 检查Node.js后端
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${RED}❌ Node.js后端: 仍在运行${NC}"
    else
        echo -e "${GREEN}✅ Node.js后端: 已停止${NC}"
    fi
    
    # 检查React前端
    if pgrep -f "react-scripts" > /dev/null; then
        echo -e "${RED}❌ React前端: 仍在运行${NC}"
    else
        echo -e "${GREEN}✅ React前端: 已停止${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 常用命令:${NC}"
    echo "   启动服务: ./start-all-services.sh"
    echo "   查看进程: ps aux | grep -E '(python.*start_service|node.*server|react-scripts)'"
    echo "   强制清理: pkill -9 -f 'python.*start_service|node.*server|react-scripts'"
}

# 主执行流程
main() {
    stop_python_service
    stop_backend_service
    stop_frontend_service
    stop_related_processes
    
    # 等待所有进程完全停止
    sleep 2
    
    check_ports
    show_final_status
    
    echo -e "${GREEN}🎉 所有服务已停止！${NC}"
}

# 执行主函数
main
