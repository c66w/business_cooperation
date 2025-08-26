#!/bin/bash

# 商家合作查看系统 - 后台停止脚本
# 使用方法: ./stop-daemon.sh

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

# PID文件路径
BACKEND_PID_FILE="$LOGS_DIR/backend.pid"
FRONTEND_PID_FILE="$LOGS_DIR/frontend.pid"
PYTHON_SERVICE_PID_FILE="$LOGS_DIR/python_service.pid"

echo -e "${BLUE}🛑 停止商家合作查看系统...${NC}"

# 停止服务函数
stop_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    
    if [ ! -f "$pid_file" ]; then
        echo -e "${YELLOW}⚠️  $service_name PID文件不存在: $pid_file${NC}"
        
        # 尝试通过端口查找进程
        if [ -n "$port" ]; then
            local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null || echo "")
            if [ -n "$pid" ]; then
                echo -e "${YELLOW}🔍 通过端口 $port 找到进程 PID: $pid${NC}"
                echo "正在停止进程..."
                if kill -TERM $pid 2>/dev/null; then
                    sleep 2
                    if kill -0 $pid 2>/dev/null; then
                        echo "进程未响应TERM信号，使用KILL信号..."
                        kill -KILL $pid 2>/dev/null || true
                    fi
                    echo -e "${GREEN}✅ $service_name 服务已停止${NC}"
                else
                    echo -e "${RED}❌ 无法停止 $service_name 服务${NC}"
                fi
            else
                echo -e "${GREEN}✅ $service_name 服务未运行${NC}"
            fi
        else
            echo -e "${GREEN}✅ $service_name 服务未运行${NC}"
        fi
        return
    fi
    
    local pid=$(cat "$pid_file")
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  $service_name PID文件为空${NC}"
        rm -f "$pid_file"
        return
    fi
    
    # 检查进程是否存在
    if ! kill -0 $pid 2>/dev/null; then
        echo -e "${YELLOW}⚠️  $service_name 进程 (PID: $pid) 不存在，清理PID文件${NC}"
        rm -f "$pid_file"
        return
    fi
    
    echo -e "${BLUE}🔄 停止 $service_name 服务 (PID: $pid)...${NC}"
    
    # 尝试优雅停止
    if kill -TERM $pid 2>/dev/null; then
        echo "发送TERM信号，等待进程退出..."
        
        # 等待最多10秒
        local count=0
        while [ $count -lt 10 ]; do
            if ! kill -0 $pid 2>/dev/null; then
                echo -e "${GREEN}✅ $service_name 服务已优雅停止${NC}"
                rm -f "$pid_file"
                return
            fi
            sleep 1
            count=$((count + 1))
        done
        
        # 如果优雅停止失败，强制停止
        echo -e "${YELLOW}⚠️  进程未响应TERM信号，使用KILL信号强制停止...${NC}"
        if kill -KILL $pid 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name 服务已强制停止${NC}"
        else
            echo -e "${RED}❌ 无法停止 $service_name 服务${NC}"
        fi
    else
        echo -e "${RED}❌ 无法发送停止信号给 $service_name 服务${NC}"
    fi
    
    # 清理PID文件
    rm -f "$pid_file"
}

# 停止所有相关进程
stop_all_processes() {
    echo -e "${BLUE}🔍 查找所有相关进程...${NC}"
    
    # 查找可能的node和python进程
    local node_pids=$(pgrep -f "react-scripts\|nodemon\|node.*server\.js" 2>/dev/null || echo "")
    local python_pids=$(pgrep -f "python.*start_service\.py\|uvicorn" 2>/dev/null || echo "")
    
    if [ -n "$node_pids" ] || [ -n "$python_pids" ]; then
        if [ -n "$node_pids" ]; then
            echo -e "${YELLOW}发现可能相关的Node.js进程:${NC}"
            echo "$node_pids" | while read -r pid; do
                if [ -n "$pid" ]; then
                    local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
                    echo "  PID $pid: $cmd"
                fi
            done
        fi

        if [ -n "$python_pids" ]; then
            echo -e "${YELLOW}发现可能相关的Python进程:${NC}"
            echo "$python_pids" | while read -r pid; do
                if [ -n "$pid" ]; then
                    local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
                    echo "  PID $pid: $cmd"
                fi
            done
        fi

        echo ""
        read -p "是否要停止这些进程? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -n "$node_pids" ]; then
                echo "$node_pids" | while read -r pid; do
                    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
                        echo "停止Node.js进程 $pid..."
                        kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null || true
                    fi
                done
            fi

            if [ -n "$python_pids" ]; then
                echo "$python_pids" | while read -r pid; do
                    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
                        echo "停止Python进程 $pid..."
                        kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null || true
                    fi
                done
            fi
            echo -e "${GREEN}✅ 相关进程已停止${NC}"
        fi
    else
        echo -e "${GREEN}✅ 未发现相关的Node.js或Python进程${NC}"
    fi
}

# 清理日志文件
cleanup_logs() {
    echo ""
    read -p "是否要清理日志文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$LOGS_DIR" ]; then
            echo -e "${BLUE}🧹 清理日志文件...${NC}"
            rm -f "$LOGS_DIR"/*.log
            echo -e "${GREEN}✅ 日志文件已清理${NC}"
        fi
    fi
}

# 主停止流程
main() {
    # 停止前端服务
    stop_service "前端" "$FRONTEND_PID_FILE" "6415"

    # 停止后端服务
    stop_service "后端" "$BACKEND_PID_FILE" "3001"

    # 停止Python微服务
    stop_service "Python微服务" "$PYTHON_SERVICE_PID_FILE" "8000"

    # 检查是否还有相关进程
    stop_all_processes

    # 询问是否清理日志
    cleanup_logs

    echo ""
    echo -e "${GREEN}🎉 混合架构系统已完全停止！${NC}"
    echo ""
}

# 执行主函数
main "$@"
