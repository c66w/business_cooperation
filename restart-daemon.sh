#!/bin/bash

# 商家合作查看系统 - 重启脚本
# 使用方法: ./restart-daemon.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🔄 重启混合架构系统 (Node.js + Python)...${NC}"
echo ""

# 停止服务
echo -e "${YELLOW}第一步: 停止现有服务${NC}"
if [ -f "$PROJECT_ROOT/stop-daemon.sh" ]; then
    "$PROJECT_ROOT/stop-daemon.sh"
else
    echo -e "${RED}❌ 停止脚本不存在${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}等待服务完全停止...${NC}"
sleep 3

# 启动服务
echo -e "${YELLOW}第二步: 启动服务${NC}"
if [ -f "$PROJECT_ROOT/start-daemon.sh" ]; then
    "$PROJECT_ROOT/start-daemon.sh"
else
    echo -e "${RED}❌ 启动脚本不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 混合架构系统重启完成！${NC}"
echo -e "${BLUE}📱 前端: http://localhost:6415${NC}"
echo -e "${BLUE}🔧 后端: http://localhost:3001${NC}"
echo -e "${BLUE}🐍 Python微服务: http://localhost:8000${NC}"
