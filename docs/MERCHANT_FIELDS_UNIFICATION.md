# 商家字段配置统一方案

## 概述

本项目已实现商家类型字段配置的统一管理，确保前端、后端、数据库配置完全一致，避免配置不一致导致的问题。

## 统一配置文件

### 后端配置文件
- **位置**: `backend/config/merchant-fields.js`
- **用途**: 为后端服务提供统一的字段配置
- **导出**: 
  - `MERCHANT_TYPE_FIELDS`: 完整的字段配置对象
  - `getFieldsByType()`: 获取指定类型的字段配置
  - `getFieldsForDatabaseInsert()`: 获取数据库插入格式
  - `getFieldsForFrontend()`: 获取前端表单格式

### 前端配置文件
- **位置**: `frontend/src/config/merchant-fields.js`
- **用途**: 为前端组件提供统一的字段配置
- **导出**:
  - `MERCHANT_TYPE_FIELDS`: 完整的字段配置对象
  - `getFieldsByType()`: 获取指定类型的字段配置
  - `getDefaultValues()`: 获取字段默认值

## 支持的商家类型

1. **factory** (工厂) - 11个字段
2. **brand** (品牌商) - 4个字段
3. **agent** (代理商) - 4个字段
4. **dealer** (经销商) - 4个字段
5. **operator** (代运营商) - 4个字段

## 字段类型

- `text`: 单行文本输入
- `textarea`: 多行文本输入
- `select`: 下拉选择
- `radio`: 单选按钮
- `checkbox`: 多选框
- `number`: 数字输入
- `email`: 邮箱输入
- `phone`: 电话输入
- `file`: 文件上传

## 使用方法

### 后端使用

```javascript
const { getFieldsByType, getFieldsForDatabaseInsert } = require('./config/merchant-fields');

// 获取工厂类型的字段配置
const factoryFields = getFieldsByType('factory');

// 获取数据库插入格式
const insertData = getFieldsForDatabaseInsert('factory');
```

### 前端使用

```javascript
import { getFieldsByType, getDefaultValues } from '../config/merchant-fields';

// 获取工厂类型的字段配置
const factoryFields = getFieldsByType('factory');

// 获取默认值
const defaults = getDefaultValues('factory');
```

## 配置更新流程

1. **修改配置文件**: 在 `backend/config/merchant-fields.js` 中更新字段配置
2. **同步前端配置**: 在 `frontend/src/config/merchant-fields.js` 中同步更新
3. **更新数据库**: 运行 SQLite 初始化脚本或手动更新数据库
4. **重启服务**: 重启后端服务使配置生效

## 字段配置结构

```javascript
{
  field_name: 'field_name',           // 字段名（英文）
  field_label: '字段显示名称',        // 字段标签（中文）
  field_type: 'text',                 // 字段类型
  field_options: null,                // 字段选项（JSON格式）
  is_required: false,                 // 是否必填
  validation_rules: null,             // 验证规则（JSON格式）
  display_order: 1                    // 显示顺序
}
```

## 数据库表结构

```sql
CREATE TABLE merchant_type_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_type TEXT NOT NULL,           -- 商家类型
    field_name TEXT NOT NULL,              -- 字段名
    field_label TEXT NOT NULL,             -- 字段标签
    field_type TEXT NOT NULL,              -- 字段类型
    field_options TEXT,                    -- 字段选项（JSON）
    is_required BOOLEAN DEFAULT 0,         -- 是否必填
    validation_rules TEXT,                 -- 验证规则（JSON）
    display_order INTEGER DEFAULT 0,       -- 显示顺序
    is_active BOOLEAN DEFAULT 1,           -- 是否启用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_type, field_name)
);
```

## 优势

1. **配置统一**: 前后端使用相同的字段配置，避免不一致
2. **易于维护**: 集中管理字段配置，修改时只需更新配置文件
3. **类型安全**: 使用结构化的配置对象，减少配置错误
4. **扩展性强**: 新增字段类型或商家类型时，只需在配置文件中添加
5. **版本控制**: 配置文件纳入版本控制，便于跟踪配置变更

## 注意事项

1. **配置同步**: 修改后端配置后，必须同步更新前端配置
2. **数据库一致性**: 确保数据库中的字段配置与配置文件一致
3. **字段名唯一性**: 同一商家类型下的字段名必须唯一
4. **向后兼容**: 新增字段时，确保不影响现有功能
5. **测试验证**: 配置更新后，必须进行充分测试

## 故障排除

### 常见问题

1. **字段不显示**: 检查字段配置是否正确，`is_active` 是否为 1
2. **验证失败**: 检查 `validation_rules` 配置是否正确
3. **顺序错乱**: 检查 `display_order` 配置是否正确
4. **类型不匹配**: 检查前端字段类型与配置是否一致

### 调试方法

1. **查看配置**: 使用 `getFieldsByType()` 函数查看当前配置
2. **检查数据库**: 直接查询 `merchant_type_fields` 表
3. **日志输出**: 在关键位置添加日志输出，查看配置加载情况
4. **前端调试**: 使用浏览器开发者工具查看字段配置

## 未来改进

1. **配置管理界面**: 开发管理员界面，支持在线配置字段
2. **配置版本管理**: 支持字段配置的版本控制和回滚
3. **动态配置**: 支持运行时动态修改字段配置
4. **配置验证**: 增加配置文件的格式验证和完整性检查
5. **国际化支持**: 支持多语言字段标签配置 