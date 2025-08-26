#!/bin/bash

# 商家合作查看系统 - 后台启动脚本
# 使用方法: ./start-daemon.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PYTHON_SERVICE_DIR="$PROJECT_ROOT/document_service"

# PID文件路径
BACKEND_PID_FILE="$LOGS_DIR/backend.pid"
FRONTEND_PID_FILE="$LOGS_DIR/frontend.pid"
PYTHON_SERVICE_PID_FILE="$LOGS_DIR/python_service.pid"

# 日志文件路径
BACKEND_LOG_FILE="$LOGS_DIR/backend.log"
FRONTEND_LOG_FILE="$LOGS_DIR/frontend.log"
PYTHON_SERVICE_LOG_FILE="$LOGS_DIR/python_service.log"

# 端口配置
BACKEND_PORT=3001
FRONTEND_PORT=6415
PYTHON_SERVICE_PORT=8000

echo -e "${BLUE}🚀 启动商家合作查看系统 (后台模式)...${NC}"

# 创建logs目录
mkdir -p "$LOGS_DIR"

# 检查端口是否被占用
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  警告: 端口 $port 已被占用 ($service_name)${NC}"
        echo "正在检查是否为本项目进程..."
        
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        if [[ "$service_name" == "后端" && -f "$BACKEND_PID_FILE" ]]; then
            local saved_pid=$(cat "$BACKEND_PID_FILE" 2>/dev/null || echo "")
            if [[ "$pid" == "$saved_pid" ]]; then
                echo -e "${GREEN}✅ 端口 $port 被本项目的$service_name服务占用，继续启动${NC}"
                return 0
            fi
        elif [[ "$service_name" == "前端" && -f "$FRONTEND_PID_FILE" ]]; then
            local saved_pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null || echo "")
            if [[ "$pid" == "$saved_pid" ]]; then
                echo -e "${GREEN}✅ 端口 $port 被本项目的$service_name服务占用，继续启动${NC}"
                return 0
            fi
        elif [[ "$service_name" == "Python微服务" && -f "$PYTHON_SERVICE_PID_FILE" ]]; then
            local saved_pid=$(cat "$PYTHON_SERVICE_PID_FILE" 2>/dev/null || echo "")
            if [[ "$pid" == "$saved_pid" ]]; then
                echo -e "${GREEN}✅ 端口 $port 被本项目的$service_name服务占用，继续启动${NC}"
                return 0
            fi
        fi
        
        echo -e "${RED}❌ 端口 $port 被其他进程占用，请先停止相关服务或更改端口${NC}"
        echo "占用进程 PID: $pid"
        return 1
    fi
    return 0
}

# 检查依赖是否安装
check_dependencies() {
    echo -e "${BLUE}📦 检查依赖安装状态...${NC}"
    
    # 检查根目录依赖
    if [ ! -d "node_modules" ]; then
        echo "📦 安装根目录依赖..."
        npm install
    fi
    
    # 检查后端依赖
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo "📦 安装后端依赖..."
        cd "$BACKEND_DIR" && npm install && cd "$PROJECT_ROOT"
    fi
    
    # 检查前端依赖
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "📦 安装前端依赖..."
        cd "$FRONTEND_DIR" && npm install && cd "$PROJECT_ROOT"
    fi

    # 检查Python微服务依赖
    if [ ! -d "$PYTHON_SERVICE_DIR/venv" ]; then
        echo "📦 创建Python虚拟环境..."
        cd "$PYTHON_SERVICE_DIR" && python3 -m venv venv && cd "$PROJECT_ROOT"
    fi

    echo "📦 检查Python依赖..."
    cd "$PYTHON_SERVICE_DIR"
    source venv/bin/activate
    pip install -q fastapi uvicorn python-multipart loguru openai pydantic pydantic-settings
    deactivate
    cd "$PROJECT_ROOT"

    echo -e "${GREEN}✅ 依赖检查完成${NC}"
}

# 启动Python微服务
start_python_service() {
    echo -e "${BLUE}🐍 启动Python微服务...${NC}"

    if ! check_port $PYTHON_SERVICE_PORT "Python微服务"; then
        return 1
    fi

    cd "$PYTHON_SERVICE_DIR"

    # 启动Python微服务并记录PID
    nohup bash -c "source venv/bin/activate && python start_service.py" > "$PYTHON_SERVICE_LOG_FILE" 2>&1 &
    local python_pid=$!
    echo $python_pid > "$PYTHON_SERVICE_PID_FILE"

    cd "$PROJECT_ROOT"

    # 等待Python服务启动
    echo "等待Python微服务启动..."
    sleep 5

    # 检查Python服务是否成功启动
    if kill -0 $python_pid 2>/dev/null; then
        echo -e "${GREEN}✅ Python微服务启动成功 (PID: $python_pid, 端口: $PYTHON_SERVICE_PORT)${NC}"
        return 0
    else
        echo -e "${RED}❌ Python微服务启动失败${NC}"
        echo "查看日志: tail -f $PYTHON_SERVICE_LOG_FILE"
        return 1
    fi
}

# 启动后端服务
start_backend() {
    echo -e "${BLUE}🔧 启动后端服务...${NC}"

    if ! check_port $BACKEND_PORT "后端"; then
        return 1
    fi

    cd "$BACKEND_DIR"

    # 启动后端服务并记录PID
    BACKEND_PORT=$BACKEND_PORT nohup node server.js > "$BACKEND_LOG_FILE" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$BACKEND_PID_FILE"

    cd "$PROJECT_ROOT"

    # 等待后端启动
    echo "等待后端服务启动..."
    sleep 3

    # 检查后端是否成功启动
    if kill -0 $backend_pid 2>/dev/null; then
        echo -e "${GREEN}✅ 后端服务启动成功 (PID: $backend_pid, 端口: $BACKEND_PORT)${NC}"
        return 0
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        echo "查看日志: tail -f $BACKEND_LOG_FILE"
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    echo -e "${BLUE}📱 启动前端服务...${NC}"
    
    if ! check_port $FRONTEND_PORT "前端"; then
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # 启动前端服务并记录PID
    PORT=$FRONTEND_PORT nohup npm start > "$FRONTEND_LOG_FILE" 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$FRONTEND_PID_FILE"
    
    cd "$PROJECT_ROOT"
    
    # 等待前端启动
    echo "等待前端服务启动..."
    sleep 5
    
    # 检查前端是否成功启动
    if kill -0 $frontend_pid 2>/dev/null; then
        echo -e "${GREEN}✅ 前端服务启动成功 (PID: $frontend_pid, 端口: $FRONTEND_PORT)${NC}"
        return 0
    else
        echo -e "${RED}❌ 前端服务启动失败${NC}"
        echo "查看日志: tail -f $FRONTEND_LOG_FILE"
        return 1
    fi
}

# 主启动流程
main() {
    # 检查依赖
    check_dependencies

    # 启动Python微服务
    if ! start_python_service; then
        echo -e "${RED}❌ Python微服务启动失败，退出${NC}"
        exit 1
    fi

    # 启动后端
    if ! start_backend; then
        echo -e "${RED}❌ 后端启动失败，但Python微服务已启动${NC}"
        echo "可以使用 ./stop-daemon.sh 停止所有服务"
        exit 1
    fi

    # 启动前端
    if ! start_frontend; then
        echo -e "${RED}❌ 前端启动失败，但后端和Python微服务已启动${NC}"
        echo "可以使用 ./stop-daemon.sh 停止所有服务"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}🎉 混合架构系统启动完成！${NC}"
    echo -e "${BLUE}📱 前端地址: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${BLUE}🔧 后端地址: http://localhost:$BACKEND_PORT${NC}"
    echo -e "${BLUE}🐍 Python微服务: http://localhost:$PYTHON_SERVICE_PORT${NC}"
    echo -e "${BLUE}📖 API文档: http://localhost:$PYTHON_SERVICE_PORT/docs${NC}"
    echo ""
    echo -e "${YELLOW}📋 管理命令:${NC}"
    echo "  停止服务: ./stop-daemon.sh"
    echo "  重启服务: ./restart-daemon.sh"
    echo "  查看状态: ./status-daemon.sh"
    echo "  查看后端日志: tail -f $BACKEND_LOG_FILE"
    echo "  查看前端日志: tail -f $FRONTEND_LOG_FILE"
    echo "  查看Python日志: tail -f $PYTHON_SERVICE_LOG_FILE"
    echo ""
}

# 执行主函数
main "$@"
