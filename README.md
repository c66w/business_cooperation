# 商家合作查看系统

这是一个用于查看商家合作申请的管理系统，包含前端React应用和后端Express.js API服务。

## 🚀 功能特性

- 📋 商家合作信息展示
- 📄 资质文档管理与在线查看
- 👀 详细信息查看
- 📊 数据统计展示
- 🔗 数据关联查询（通过user_id关联两张表）
- 💾 文件下载功能
- 🔍 文件在线预览
- 📱 响应式设计

## 技术栈

### 前端
- React 18
- Ant Design 5
- Axios

### 后端
- Node.js
- Express.js
- CORS

## 数据库表结构

### business_cooperation (商家合作信息表)
- `__id`: 主键
- `user_id`: 用户ID（唯一值）
- `company_name`: 公司名称
- `attendee_name`: 联系人姓名
- `contact_info`: 联系人电话
- `attendee_job`: 公司职务
- `industry_operator`: 对接的行业运营花名

### business_qualification_document (招商资质文档数据表)
- `__id`: 主键
- `user_id`: 用户ID（关联字段）
- `file_name`: 文件名称
- `file_url`: 文件地址
- `file_id`: 文件ID
- `file_type`: 文件类型
- `upload_time`: 上传时间

## 🛠️ 安装和运行

### 📦 克隆项目

```bash
git clone https://github.com/c66w/business_cooperation.git
cd business_cooperation
```

### 1. 配置数据库连接

复制环境变量配置文件：
```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件，配置你的数据库连接信息：
```bash
DB_BASE_URL=https://data-server-test.ywwl.com
DB_CONNECTION_ID=你的连接ID
DB_TIMEOUT=30000
PORT=3001
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装所有项目依赖（前端+后端）
npm run install-all
```

### 3. 测试数据库连接

启动后端服务并测试数据库连接：
```bash
cd backend && npm run dev
```

在浏览器中访问 http://localhost:3001/api/test/connection 测试数据库连接。

### 4. 启动开发服务器

```bash
# 同时启动前端和后端服务
npm run dev
```

或者分别启动：

```bash
# 启动后端服务 (端口: 3001)
npm run server

# 启动前端服务 (端口: 6415)
npm run client
```

### 5. 访问应用

- 前端应用: http://localhost:6415
- 后端API: http://localhost:3001

## 🔧 后台服务管理

### 后台启动/停止脚本

项目提供了便捷的后台服务管理脚本：

#### 🚀 后台启动
```bash
./start-daemon.sh
```
- 自动检查并安装依赖
- 后台启动前端和后端服务
- 生成PID文件用于进程管理
- 记录服务日志到 `logs/` 目录

#### 🛑 停止服务
```bash
./stop-daemon.sh
```
- 优雅停止所有服务
- 清理PID文件
- 可选择清理日志文件

#### 📊 查看状态
```bash
./status-daemon.sh
```
- 显示服务运行状态
- 检查端口占用情况
- 显示进程信息和资源使用
- 显示最近的日志内容

#### 🔄 重启服务
```bash
./restart-daemon.sh
```
- 先停止再启动所有服务

#### 📋 日志管理
```bash
# 查看后端日志
tail -f logs/backend.log

# 查看前端日志
tail -f logs/frontend.log

# 实时监控状态
watch -n 2 ./status-daemon.sh
```

### 服务端口配置
- **前端服务**: 6415 (可通过 `frontend/.env` 中的 `PORT` 修改)
- **后端服务**: 3001 (可通过 `backend/.env` 中的 `BACKEND_PORT` 修改)

## API接口

### 获取商家合作列表
```
GET /api/review/list
```

### 获取详细信息
```
GET /api/review/detail/:userId
```

### 测试数据库连接
```
GET /api/test/connection
```

## 项目结构

```
business_cooperation/
├── package.json                 # 根目录配置
├── README.md                   # 项目说明
├── start.sh                    # 启动脚本
├── backend/                    # 后端服务
│   ├── package.json
│   ├── server.js              # Express服务器
│   ├── .env.example           # 环境变量示例
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── utils/
│   │   └── validators.js      # 数据验证工具
│   └── scripts/
│       └── test-db.js         # 数据库测试脚本
└── frontend/                  # 前端应用
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js           # 入口文件
        ├── App.js             # 主应用组件
        ├── components/
        │   └── ReviewPage.js  # 查看页面组件
        └── services/
            └── api.js         # API服务
```

## 功能说明

1. **数据关联**: 通过user_id字段关联business_cooperation和business_qualification_document两张表的数据
2. **信息列表**: 展示所有商家合作申请，包含基本信息和资质文档数量
3. **详情查看**: 点击"查看详情"可以查看完整的合作信息和所有资质文档
4. **统计展示**: 显示合作申请总数、文档总数、涉及运营人员数等统计信息
5. **文档下载**: 支持查看和下载资质文档

## 数据存储

系统使用SQLite本地数据库存储所有数据：
- 商家申请信息
- 工作流任务和历史记录
- 审核员信息
- 文档上传记录

## 开发说明

- 后端使用SQLite本地数据库，无需外部数据库配置
- 数据库文件位于 `backend/data/business_cooperation.db`
- 包含SQL注入防护和数据验证
- 支持完整的商家申请、审核、工作流管理功能
- 所有数据持久化存储，重启不丢失

## 数据库要求

确保数据库中存在以下两张表：

1. `business_cooperation` - 商家合作信息表
2. `business_qualification_document` - 招商资质文档数据表

表结构请参考项目文档中的SQL建表语句。

## 🚀 部署

### 生产环境部署

1. **构建前端应用**
```bash
cd frontend
npm run build
```

2. **配置生产环境变量**
```bash
# 在backend/.env中配置生产环境数据库
DB_BASE_URL=your_production_api_url
DB_CONNECTION_ID=your_production_connection_id
NODE_ENV=production
```

3. **启动生产服务**
```bash
cd backend
npm start
```

## 🐳 Docker部署

### 快速部署

使用提供的脚本一键构建和运行：

```bash
# 一键构建和启动
./build-and-run.sh
```

### 手动部署

```bash
# 1. 构建镜像
docker compose build

# 2. 启动服务
docker compose up -d

# 3. 查看日志
docker compose logs -f

# 4. 停止服务
docker compose down
```

### 生产环境部署

在Linux服务器上部署时：

```bash
# 1. 克隆项目
git clone https://github.com/c66w/business_cooperation.git
cd business_cooperation

# 2. 构建和启动
./build-and-run.sh

# 3. 访问应用
# 前端页面: http://your-server-ip:3001
# API接口: http://your-server-ip:3001/api
```

### 端口说明

- **3001**: 主服务端口（前端页面 + 后端API）
- **8000**: Python微服务端口（可选，用于直接访问文档处理API）

### 环境变量配置

生产环境部署时，可以通过环境变量配置：

```bash
# docker-compose.override.yml
version: '3.8'
services:
  business-cooperation:
    environment:
      - NODE_ENV=production
      - BACKEND_PORT=3001
      - PYTHON_SERVICE_PORT=8000
```

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.0.0 (2024-08-22)
- ✨ 初始版本发布
- 📋 商家合作信息管理
- 📄 资质文档查看和下载
- 🔍 文件在线预览功能
- 📊 数据统计展示

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

- **Cooper** - [c66w](https://github.com/c66w)

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Ant Design](https://ant.design/) - UI组件库
- [Express.js](https://expressjs.com/) - 后端框架
