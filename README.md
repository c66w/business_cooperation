# 商家合作查看系统

这是一个用于查看商家合作申请的管理系统，包含前端React应用和后端Express.js API服务。

## 功能特性

- 📋 商家合作信息展示
- 📄 资质文档管理
- 👀 详细信息查看
- 📊 数据统计展示
- 🔗 数据关联查询（通过user_id关联两张表）

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

## 安装和运行

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

# 启动前端服务 (端口: 3000)
npm run client
```

### 5. 访问应用

- 前端应用: http://localhost:3000
- 后端API: http://localhost:3001

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

## Mock数据

系统包含3个用户的测试数据：
- user_001: 阿里巴巴集团（2个文档）
- user_002: 腾讯科技有限公司（2个文档）
- user_003: 字节跳动（1个文档）

## 开发说明

- 后端已连接真实数据库，使用提供的API接口查询数据
- 数据库连接配置在 `backend/config/database.js` 中
- 包含SQL注入防护和数据验证
- 文件下载功能为模拟实现，实际项目中需要配置文件服务器
- 当前版本只提供查看功能，如需审核功能可在此基础上扩展

## 数据库要求

确保数据库中存在以下两张表：

1. `business_cooperation` - 商家合作信息表
2. `business_qualification_document` - 招商资质文档数据表

表结构请参考项目文档中的SQL建表语句。
