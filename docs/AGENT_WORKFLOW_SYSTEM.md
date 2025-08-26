# Agent & Workflow 商家合作管理系统

## 🎯 系统概述

基于现有的商家合作审核系统，我们设计并实现了一个完整的 Agent & Workflow 架构，用于自动化处理商家信息收集、验证和审核流程。

## 🏗️ 系统架构

### Agent 系统

#### 1. **DataCollectionAgent (数据收集代理)**
- **职责**: 处理商家表单数据的收集、验证和初步处理
- **功能**:
  - 动态表单字段验证
  - 数据清理和标准化
  - 文件上传验证
  - 生成唯一用户ID

#### 2. **ValidationAgent (验证代理)**
- **职责**: 对收集到的数据进行深度验证和业务规则检查
- **功能**:
  - 基础数据格式验证
  - 业务规则验证
  - 外部数据验证（企业信息查询）
  - 验证分数计算

#### 3. **SystemAgent (系统代理)**
- **职责**: 数据库操作、状态管理、任务创建
- **功能**:
  - 保存商家数据
  - 创建工作流任务
  - 状态转换管理
  - 历史记录维护

#### 4. **NotificationAgent (通知代理)**
- **职责**: 发送各种类型的通知
- **功能**:
  - 邮件通知
  - 短信通知
  - 系统内通知
  - Webhook通知

### Workflow Engine (工作流引擎)

#### 工作流定义
```
商家入驻流程:
1. 数据收集 (DataCollectionAgent) → 自动
2. 数据验证 (ValidationAgent) → 自动
3. 人工审核 (ReviewAgent) → 手动
4. 审核结果处理 (SystemAgent) → 自动
```

#### 状态管理
- `draft` → `submitted` → `under_review` → `approved/rejected/changes_requested`

## 📊 数据库设计

### 核心表结构

1. **business_cooperation** - 商家基础信息
2. **merchant_details** - 动态字段存储
3. **workflow_tasks** - 工作流任务
4. **workflow_history** - 工作流历史
5. **notifications** - 通知记录
6. **merchant_type_fields** - 字段定义
7. **reviewers** - 审核员信息

## 🚀 功能特性

### 1. 动态表单系统
- 根据商家类型动态显示字段
- 支持5种商家类型：工厂、品牌商、代理商、经销商、代运营商
- 实时表单验证
- 文件上传支持

### 2. 自动化工作流
- 自动数据收集和验证
- 智能任务分配
- 状态自动流转
- 异常处理和恢复

### 3. 审核管理界面
- 任务列表和筛选
- 详细信息查看
- 审核操作界面
- 统计数据展示

### 4. 通知系统
- 多渠道通知支持
- 模板化消息
- 失败重试机制
- 通知历史追踪

## 🛠️ 技术栈

### 后端
- **Node.js + Express** - 服务器框架
- **Agent架构** - 模块化处理逻辑
- **WorkflowEngine** - 工作流管理
- **Multer** - 文件上传处理
- **UUID** - 唯一标识生成

### 前端
- **React 18** - 用户界面
- **Ant Design 5** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端

### 数据库
- **MySQL** - 关系型数据库
- **JSON字段** - 动态数据存储

## 📁 项目结构

```
business_cooperation2/
├── backend/
│   ├── agents/                 # Agent系统
│   │   ├── BaseAgent.js       # 基础Agent类
│   │   ├── DataCollectionAgent.js
│   │   ├── ValidationAgent.js
│   │   ├── SystemAgent.js
│   │   └── NotificationAgent.js
│   ├── workflow/              # 工作流引擎
│   │   └── WorkflowEngine.js
│   ├── routes/                # API路由
│   │   ├── merchant.js        # 商家申请相关
│   │   └── review.js          # 审核管理相关
│   └── server.js              # 主服务器
├── frontend/
│   └── src/
│       └── components/
│           ├── DynamicForm.js           # 动态表单
│           ├── MerchantApplicationPage.js # 申请页面
│           └── ReviewManagementPage.js   # 审核管理
├── docs/
│   ├── database-schema.sql    # 数据库设计
│   └── AGENT_WORKFLOW_SYSTEM.md
└── test-workflow.js           # 系统测试脚本
```

## 🔧 安装和运行

### 1. 安装依赖
```bash
# 安装所有依赖
npm run install-all

# 或分别安装
cd backend && npm install
cd frontend && npm install
```

### 2. 配置数据库
```bash
# 执行数据库脚本
mysql -u username -p database_name < docs/database-schema.sql
```

### 3. 启动服务
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run server  # 后端 (端口: 3001)
npm run client  # 前端 (端口: 6415)
```

### 4. 测试系统
```bash
# 运行工作流测试
node test-workflow.js
```

## 🌐 访问地址

- **商家查看**: http://localhost:6415/
- **商家申请**: http://localhost:6415/apply
- **审核管理**: http://localhost:6415/review
- **后端API**: http://localhost:3001

## 📋 API接口

### 商家申请相关
- `POST /api/merchant/apply` - 提交申请
- `GET /api/merchant/fields/:type` - 获取字段配置
- `GET /api/merchant/status/:userId` - 查询申请状态

### 审核管理相关
- `GET /api/review/tasks` - 获取任务列表
- `GET /api/review/statistics` - 获取统计数据
- `POST /api/review/submit` - 提交审核结果

## 🔄 工作流程

### 商家申请流程
1. **表单填写** - 商家选择类型并填写对应信息
2. **自动验证** - 系统验证数据格式和业务规则
3. **任务创建** - 自动创建审核任务并分配
4. **人工审核** - 审核员查看详情并做出决定
5. **结果通知** - 系统发送审核结果通知
6. **状态更新** - 更新申请状态和历史记录

### 审核管理流程
1. **任务接收** - 审核员查看分配的任务
2. **详情查看** - 查看商家详细信息和文档
3. **审核决定** - 选择通过/拒绝/需要修改
4. **意见填写** - 填写详细的审核意见
5. **结果提交** - 提交审核结果并推进工作流

## 🎯 核心优势

1. **模块化设计** - Agent架构便于扩展和维护
2. **自动化流程** - 减少人工干预，提高效率
3. **动态表单** - 根据商家类型自适应字段
4. **状态追踪** - 完整的历史记录和状态管理
5. **通知机制** - 多渠道及时通知相关人员
6. **可扩展性** - 易于添加新的Agent和工作流步骤

## 🔮 未来扩展

1. **AI辅助审核** - 集成机器学习模型辅助决策
2. **更多通知渠道** - 支持微信、钉钉等企业通讯工具
3. **高级分析** - 审核效率分析和优化建议
4. **移动端支持** - 开发移动端审核应用
5. **集成外部系统** - 对接CRM、ERP等企业系统
