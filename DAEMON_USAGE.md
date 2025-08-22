# 后台服务管理脚本使用指南

## 📋 脚本概览

| 脚本名称 | 功能描述 | 使用场景 |
|---------|---------|---------|
| `start-daemon.sh` | 后台启动服务 | 生产环境部署、开发环境后台运行 |
| `stop-daemon.sh` | 停止所有服务 | 维护、更新、关机前清理 |
| `status-daemon.sh` | 查看服务状态 | 监控、故障排查、健康检查 |
| `restart-daemon.sh` | 重启所有服务 | 配置更新后重启、故障恢复 |

## 🚀 快速开始

### 1. 首次启动
```bash
# 给脚本添加执行权限（首次使用）
chmod +x *.sh

# 后台启动所有服务
./start-daemon.sh
```

### 2. 查看状态
```bash
# 检查服务运行状态
./status-daemon.sh
```

### 3. 停止服务
```bash
# 停止所有服务
./stop-daemon.sh
```

## 📊 详细功能说明

### 🚀 start-daemon.sh - 后台启动脚本

**功能特性：**
- ✅ 自动检查并安装依赖
- ✅ 端口冲突检测
- ✅ 后台进程管理（生成PID文件）
- ✅ 日志记录到文件
- ✅ 启动状态验证

**启动流程：**
1. 检查项目依赖是否安装
2. 检查端口是否被占用
3. 后台启动后端服务（端口3001）
4. 后台启动前端服务（端口6415）
5. 验证服务启动状态
6. 显示访问地址和管理命令

**生成的文件：**
- `logs/backend.pid` - 后端进程ID
- `logs/frontend.pid` - 前端进程ID
- `logs/backend.log` - 后端运行日志
- `logs/frontend.log` - 前端运行日志

### 🛑 stop-daemon.sh - 停止脚本

**功能特性：**
- ✅ 优雅停止进程（TERM信号）
- ✅ 强制停止备选（KILL信号）
- ✅ 通过端口查找进程
- ✅ 清理PID文件
- ✅ 可选日志清理

**停止流程：**
1. 读取PID文件
2. 发送TERM信号优雅停止
3. 等待进程退出（最多10秒）
4. 必要时使用KILL信号强制停止
5. 清理PID文件
6. 询问是否清理日志文件

### 📊 status-daemon.sh - 状态检查脚本

**检查内容：**
- ✅ 进程运行状态
- ✅ 端口监听状态
- ✅ 进程资源使用
- ✅ 日志文件状态
- ✅ 网络连接测试
- ✅ 系统资源概览

**显示信息：**
- 进程PID和运行状态
- CPU和内存使用率
- 端口占用情况
- 日志文件大小和最近内容
- API和前端页面可访问性
- 系统资源使用情况

### 🔄 restart-daemon.sh - 重启脚本

**重启流程：**
1. 调用停止脚本
2. 等待服务完全停止
3. 调用启动脚本
4. 验证重启结果

## 🔧 配置说明

### 端口配置
- **前端端口**: 6415 (可在 `frontend/.env` 中修改 `PORT=6415`)
- **后端端口**: 3001 (可在 `backend/.env` 中修改 `BACKEND_PORT=3001`)

### 日志配置
- **日志目录**: `logs/`
- **后端日志**: `logs/backend.log`
- **前端日志**: `logs/frontend.log`
- **PID文件**: `logs/backend.pid`, `logs/frontend.pid`

## 📋 常用命令

### 日志查看
```bash
# 实时查看后端日志
tail -f logs/backend.log

# 实时查看前端日志
tail -f logs/frontend.log

# 查看最近50行日志
tail -n 50 logs/backend.log
```

### 状态监控
```bash
# 实时监控状态（每2秒刷新）
watch -n 2 ./status-daemon.sh

# 一次性状态检查
./status-daemon.sh
```

### 进程管理
```bash
# 查看进程PID
cat logs/backend.pid
cat logs/frontend.pid

# 手动停止进程
kill $(cat logs/backend.pid)
kill $(cat logs/frontend.pid)
```

## 🚨 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   lsof -i :3001
   lsof -i :6415
   
   # 停止占用进程
   ./stop-daemon.sh
   ```

2. **服务启动失败**
   ```bash
   # 查看详细日志
   tail -f logs/backend.log
   tail -f logs/frontend.log
   ```

3. **PID文件不一致**
   ```bash
   # 清理PID文件
   rm -f logs/*.pid
   
   # 重新启动
   ./start-daemon.sh
   ```

4. **依赖问题**
   ```bash
   # 重新安装依赖
   npm install
   cd backend && npm install
   cd frontend && npm install
   ```

### 紧急停止
```bash
# 强制停止所有Node.js进程（谨慎使用）
pkill -f "node"

# 或者停止特定进程
pkill -f "react-scripts"
pkill -f "nodemon"
```

## 🎯 最佳实践

1. **生产环境部署**
   - 使用 `start-daemon.sh` 启动服务
   - 定期运行 `status-daemon.sh` 检查状态
   - 设置日志轮转避免日志文件过大

2. **开发环境**
   - 使用 `npm run dev` 进行开发调试
   - 使用后台脚本进行长时间测试

3. **维护操作**
   - 更新代码后使用 `restart-daemon.sh`
   - 定期清理日志文件
   - 监控系统资源使用

4. **监控建议**
   - 设置定时任务检查服务状态
   - 配置日志告警
   - 监控端口可用性
