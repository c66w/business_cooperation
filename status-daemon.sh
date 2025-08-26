#!/bin/bash

# 商家合作查看系统 - 状态检查脚本
# 使用方法: ./status-daemon.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

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

echo -e "${BLUE}📊 商家合作查看系统 - 状态检查${NC}"
echo "=================================================="

# 检查服务状态
check_service_status() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    local log_file=$4
    
    echo -e "\n${CYAN}🔍 检查 $service_name 服务状态:${NC}"
    echo "--------------------------------------------------"
    
    # 检查PID文件
    if [ ! -f "$pid_file" ]; then
        echo -e "  PID文件: ${RED}❌ 不存在${NC} ($pid_file)"
        local pid=""
    else
        local pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [ -z "$pid" ]; then
            echo -e "  PID文件: ${RED}❌ 为空${NC} ($pid_file)"
        else
            echo -e "  PID文件: ${GREEN}✅ 存在${NC} ($pid_file)"
            echo -e "  进程PID: ${BLUE}$pid${NC}"
        fi
    fi
    
    # 检查进程状态
    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo -e "  进程状态: ${GREEN}✅ 运行中${NC}"
        
        # 获取进程信息
        local cpu_mem=$(ps -p $pid -o %cpu,%mem --no-headers 2>/dev/null || echo "N/A N/A")
        local start_time=$(ps -p $pid -o lstart --no-headers 2>/dev/null || echo "N/A")
        echo -e "  CPU/内存: ${BLUE}$cpu_mem${NC}"
        echo -e "  启动时间: ${BLUE}$start_time${NC}"
    else
        echo -e "  进程状态: ${RED}❌ 未运行${NC}"
    fi
    
    # 检查端口状态
    local port_pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$port_pid" ]; then
        echo -e "  端口 $port: ${GREEN}✅ 监听中${NC} (PID: $port_pid)"
        if [ -n "$pid" ] && [ "$pid" != "$port_pid" ]; then
            echo -e "  ${YELLOW}⚠️  警告: 端口被不同进程占用${NC}"
        fi
    else
        echo -e "  端口 $port: ${RED}❌ 未监听${NC}"
    fi
    
    # 检查日志文件
    if [ -f "$log_file" ]; then
        local log_size=$(du -h "$log_file" 2>/dev/null | cut -f1 || echo "N/A")
        local log_lines=$(wc -l < "$log_file" 2>/dev/null || echo "N/A")
        echo -e "  日志文件: ${GREEN}✅ 存在${NC} ($log_file)"
        echo -e "  日志大小: ${BLUE}$log_size${NC} ($log_lines 行)"
        
        # 显示最后几行日志
        echo -e "  ${CYAN}最近日志 (最后5行):${NC}"
        tail -n 5 "$log_file" 2>/dev/null | sed 's/^/    /' || echo "    无法读取日志"
    else
        echo -e "  日志文件: ${RED}❌ 不存在${NC} ($log_file)"
    fi
}

# 检查网络连接
check_network_status() {
    echo -e "\n${CYAN}🌐 网络连接检查:${NC}"
    echo "--------------------------------------------------"
    
    # 检查后端API
    echo -e "  后端API测试:"
    if curl -s "http://localhost:$BACKEND_PORT/api/test/connection" >/dev/null 2>&1; then
        echo -e "    http://localhost:$BACKEND_PORT/api/test/connection ${GREEN}✅ 可访问${NC}"
    else
        echo -e "    http://localhost:$BACKEND_PORT/api/test/connection ${RED}❌ 不可访问${NC}"
    fi
    
    # 检查前端页面
    echo -e "  前端页面测试:"
    if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo -e "    http://localhost:$FRONTEND_PORT ${GREEN}✅ 可访问${NC}"
    else
        echo -e "    http://localhost:$FRONTEND_PORT ${RED}❌ 不可访问${NC}"
    fi
}

# 显示系统资源使用情况
show_system_resources() {
    echo -e "\n${CYAN}💻 系统资源使用情况:${NC}"
    echo "--------------------------------------------------"
    
    # CPU使用率
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "N/A")
    echo -e "  CPU使用率: ${BLUE}$cpu_usage%${NC}"
    
    # 内存使用情况
    local mem_info=$(vm_stat | grep -E "Pages (free|active|inactive|speculative|wired)" | awk '{print $3}' | sed 's/\.//' 2>/dev/null || echo "")
    if [ -n "$mem_info" ]; then
        local page_size=4096
        local free_pages=$(echo "$mem_info" | sed -n '1p')
        local total_mem=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
        local total_gb=$((total_mem / 1024 / 1024 / 1024))
        echo -e "  总内存: ${BLUE}${total_gb}GB${NC}"
    fi
    
    # 磁盘使用情况
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' 2>/dev/null || echo "N/A")
    echo -e "  磁盘使用率: ${BLUE}$disk_usage${NC}"
}

# 显示快速操作提示
show_quick_actions() {
    echo -e "\n${CYAN}⚡ 快速操作:${NC}"
    echo "--------------------------------------------------"
    echo -e "  启动服务: ${BLUE}./start-daemon.sh${NC}"
    echo -e "  停止服务: ${BLUE}./stop-daemon.sh${NC}"
    echo -e "  重启服务: ${BLUE}./restart-daemon.sh${NC}"
    echo -e "  查看Python日志: ${BLUE}tail -f $PYTHON_SERVICE_LOG_FILE${NC}"
    echo -e "  查看后端日志: ${BLUE}tail -f $BACKEND_LOG_FILE${NC}"
    echo -e "  查看前端日志: ${BLUE}tail -f $FRONTEND_LOG_FILE${NC}"
    echo -e "  实时监控: ${BLUE}watch -n 2 ./status-daemon.sh${NC}"
}

# 主检查流程
main() {
    # 检查Python微服务
    check_service_status "Python微服务" "$PYTHON_SERVICE_PID_FILE" "$PYTHON_SERVICE_PORT" "$PYTHON_SERVICE_LOG_FILE"

    # 检查后端服务
    check_service_status "后端" "$BACKEND_PID_FILE" "$BACKEND_PORT" "$BACKEND_LOG_FILE"

    # 检查前端服务
    check_service_status "前端" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "$FRONTEND_LOG_FILE"

    # 检查网络连接
    check_network_status

    # 显示系统资源
    show_system_resources

    # 显示快速操作
    show_quick_actions

    echo ""
    echo "=================================================="
    echo -e "${GREEN}混合架构系统状态检查完成 - $(date)${NC}"
}

# 执行主函数
main "$@"
