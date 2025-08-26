# 数据库设置指南

## 🎯 概述

本指南将帮你设置真实的MySQL数据库来支持Agent & Workflow系统的完整功能。

## 📋 当前状态

### ✅ 已完成
- **查看功能**: 使用远程数据库API，可以查看现有商家合作信息
- **申请功能**: 使用模拟数据库，可以提交申请但不会真实保存
- **审核功能**: 使用模拟数据，显示测试数据
- **工作流引擎**: 正常运行，但数据不持久化

### 🔄 需要配置
- **本地MySQL数据库**: 用于真实的数据存储
- **数据库结构扩展**: 添加Agent & Workflow系统所需的表

## 🛠️ 设置步骤

### 1. 安装MySQL服务器

#### macOS (使用Homebrew)
```bash
# 安装MySQL
brew install mysql

# 启动MySQL服务
brew services start mysql

# 设置root密码（可选）
mysql_secure_installation
```

#### 其他系统
- **Windows**: 下载MySQL Installer
- **Linux**: `sudo apt-get install mysql-server` (Ubuntu/Debian)

### 2. 创建数据库

```bash
# 连接到MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE business_cooperation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 退出MySQL
exit
```

### 3. 执行数据库初始化脚本

我们已经为你生成了完整的初始化脚本：

```bash
# 方法1: 使用命令行执行
mysql -u root -p business_cooperation < /Users/cooper/code/business_cooperation2/backend/database-init-complete.sql

# 方法2: 在MySQL客户端中执行
mysql -u root -p
USE business_cooperation;
SOURCE /Users/cooper/code/business_cooperation2/backend/database-init-complete.sql;
```

### 4. 配置数据库连接

编辑 `backend/.env` 文件，设置你的数据库连接信息：

```env
# 本地MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=business_cooperation
```

### 5. 重启服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
cd backend
node server.js
```

如果配置正确，你应该看到：
```
✅ 真实数据库连接成功
```

## 📊 数据库结构

### 核心表

1. **business_cooperation** - 商家基础信息
   - 扩展字段: `merchant_type`, `status`, `submitted_at`

2. **merchant_details** - 动态字段存储
   - 存储不同商家类型的特定字段

3. **workflow_tasks** - 工作流任务
   - 管理审核任务和状态

4. **workflow_history** - 工作流历史
   - 记录所有操作历史

5. **notifications** - 通知记录
   - 管理邮件、短信等通知

6. **reviewers** - 审核员信息
   - 管理审核人员

7. **system_config** - 系统配置
   - 存储系统参数

8. **merchant_type_fields** - 字段定义
   - 定义动态表单字段

## 🧪 测试数据库连接

### 方法1: 使用测试脚本
```bash
cd backend
node scripts/init-database.js
```

### 方法2: 使用API测试
```bash
# 测试商家申请
curl -X POST http://localhost:3001/api/merchant/apply \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "测试公司",
    "merchant_type": "factory",
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "product_category": "3C数码家电",
    "specific_products": "面膜",
    "annual_production_capacity": "100万件",
    "accept_deep_cooperation": "是"
  }'
```

### 方法3: 检查数据库表
```sql
-- 连接数据库
mysql -u root -p business_cooperation

-- 查看所有表
SHOW TABLES;

-- 查看商家数据
SELECT * FROM business_cooperation;

-- 查看工作流任务
SELECT * FROM workflow_tasks;
```

## 🔧 故障排除

### 问题1: 数据库连接失败
```
❌ 数据库连接失败: ECONNREFUSED
```

**解决方案:**
1. 确保MySQL服务正在运行: `brew services start mysql`
2. 检查端口是否正确 (默认3306)
3. 验证用户名和密码
4. 确保数据库存在

### 问题2: 表不存在
```
Table 'business_cooperation.workflow_tasks' doesn't exist
```

**解决方案:**
1. 执行完整的初始化脚本
2. 检查SQL脚本是否有语法错误
3. 确保有足够的权限创建表

### 问题3: 字符编码问题
```
Incorrect string value
```

**解决方案:**
1. 确保数据库使用utf8mb4字符集
2. 检查连接配置中的charset设置

## 📈 性能优化

### 索引优化
数据库脚本已包含必要的索引：
- `user_id` 字段的索引
- `status` 字段的索引
- `created_at` 字段的索引

### 连接池配置
在 `backend/config/database-real.js` 中调整连接池参数：
```javascript
const poolConfig = {
  connectionLimit: 10,    // 最大连接数
  queueLimit: 0,         // 队列限制
  acquireTimeout: 60000, // 获取连接超时
  timeout: 60000         // 查询超时
};
```

## 🔒 安全建议

1. **不要在生产环境使用root用户**
   ```sql
   CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON business_cooperation.* TO 'app_user'@'localhost';
   ```

2. **使用环境变量存储敏感信息**
   ```env
   DB_PASSWORD=your_secure_password
   ```

3. **定期备份数据库**
   ```bash
   mysqldump -u root -p business_cooperation > backup.sql
   ```

## 🎉 完成后的功能

配置完成后，你将拥有：

✅ **完整的数据持久化**
- 商家申请真实保存到数据库
- 审核记录完整追踪
- 工作流状态持久化

✅ **真实的审核管理**
- 从数据库读取真实的申请数据
- 审核操作直接更新数据库
- 完整的历史记录

✅ **通知系统**
- 通知记录保存到数据库
- 支持重试和状态追踪

✅ **系统配置管理**
- 动态配置存储在数据库
- 支持运行时修改参数
