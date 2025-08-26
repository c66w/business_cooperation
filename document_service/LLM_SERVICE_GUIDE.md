# LLM智能分析服务架构指南

## 🎯 概述

重新设计的LLM服务支持分阶段、分商家类型的智能表单填写，提供更精准的字段提取和建议。

## 🏗️ 架构设计

### 分阶段分析
1. **基础信息阶段** (`analyze_basic_info`)
   - 提取公司基本信息：公司名称、联系人、联系方式
   - 产品品类、合作诉求等通用字段
   - 不依赖商家类型，适用于所有申请者

2. **详细信息阶段** (`analyze_detailed_info`)
   - 根据商家类型提取特定字段
   - 使用针对性提示词优化提取效果
   - 支持5种商家类型的专门分析

### 商家类型支持
- **🏭 Factory (生产工厂)**: 生产能力、代工品牌、合作意愿
- **🏷️ Brand (品牌商)**: 品牌知名度、销售数据、营销预算
- **🤝 Agent (代理商)**: 代理品牌、渠道能力、销售数据
- **📦 Dealer (经销商)**: 经销品牌、分销网络、市场覆盖
- **🔧 Operator (代运营商)**: 运营能力、服务品牌、运营成果

## 🔧 API接口

### 1. 基础信息分析
```http
POST /api/llm/analyze/basic
Content-Type: application/json

{
  "documents": [
    {
      "name": "document.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 1024000
    }
  ],
  "currentData": {
    "company_name": "已填写的公司名称"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "基础信息分析成功",
  "data": {
    "suggestions": [
      {
        "field_name": "company_name",
        "suggested_value": "深圳市智能科技有限公司",
        "confidence": 0.95,
        "source": "llm",
        "stage": "basic_info"
      }
    ],
    "overall_confidence": 0.87,
    "processing_time": 2.3,
    "model_used": "openai/gpt-oss-120b",
    "stage": "basic_info"
  }
}
```

### 2. 详细信息分析
```http
POST /api/llm/analyze/detailed
Content-Type: application/json

{
  "documents": [...],
  "currentData": {
    "company_name": "智能科技有限公司",
    "merchant_type": "factory"
  },
  "merchantType": "factory"
}
```

### 3. 商家类型检测
```http
POST /api/llm/detect-merchant-type
Content-Type: application/json

{
  "documents": [...],
  "content": "文档内容文本"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "商家类型检测成功",
  "data": {
    "detected_type": "factory",
    "type_name": "生产工厂",
    "confidence": 0.8
  }
}
```

## 📋 字段映射

### 基础信息字段
- `company_name`: 公司全称
- `contact_name`: 联系人姓名
- `contact_phone`: 联系电话
- `contact_email`: 联系邮箱
- `product_category`: 产品品类
- `specific_products`: 具体产品描述
- `cooperation_requirements`: 合作诉求
- `industry_operator_contact`: 行业运营联系人

### 工厂类型特有字段
- `annual_production_capacity`: 年生产规模
- `own_brand`: 自有品牌
- `own_brand_operation_ability`: 自有品牌运营能力
- `oem_famous_brands`: 代工知名品牌
- `need_mold_or_repackage`: 是否需要开模或改包装
- `estimated_mold_time`: 预计开模时间
- `accept_brand_cocreation`: 是否接受品牌共创
- `accept_deep_cooperation`: 是否接受深度合作
- `accept_online_exclusive`: 是否接受线上独家
- `accept_yaowang_authorization`: 是否接受遥望授权
- `accept_omnichannel_dividend`: 是否接受全渠道分红

### 品牌商类型特有字段
- `brand_name`: 品牌名称
- `brand_popularity`: 品牌知名度
- `sales_data`: 销售数据
- `cooperation_budget`: 合作预算

## 🎯 置信度计算

### 字段类型验证
- **电话号码**: 验证中国手机号格式 (1[3-9]\d{9})
- **邮箱地址**: 验证标准邮箱格式
- **单选字段**: 检查是否为有效选项 (是/否)
- **文本字段**: 根据长度和内容调整置信度

### 置信度调整规则
- 基础置信度: 0.7
- 格式验证通过: +0.2
- 格式验证失败: -0.3
- 包含关键词: +0.1
- 内容过短(<2字符): -0.3
- 内容丰富(>100字符): +0.1

## 🧪 测试

### 运行单元测试
```bash
cd document_service
python test_new_llm_service.py
```

### 运行API测试
```bash
# 确保服务运行在 http://localhost:8000
python start_service.py

# 在另一个终端运行测试
python test_apis_simple.py
```

## 🔄 与前端集成

### 前端调用示例
```javascript
// 基础信息分析
const basicAnalysis = await fetch('/api/llm/analyze/basic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documents: uploadedFiles,
    currentData: form.getFieldsValue()
  })
});

// 详细信息分析
const detailedAnalysis = await fetch('/api/llm/analyze/detailed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documents: uploadedFiles,
    currentData: form.getFieldsValue(),
    merchantType: selectedMerchantType
  })
});
```

## 📈 性能优化

### 提示词优化
- 针对不同商家类型使用专门的提示词
- 限制文档内容长度 (3000字符)
- 结构化JSON输出格式

### 响应处理
- 智能JSON提取 (支持代码块和纯JSON)
- 字段验证和置信度计算
- 低置信度字段过滤 (阈值: 0.3)

## 🚀 部署配置

### 环境变量
```bash
# config/settings.py
LLM_CONFIG = {
    "api_key": "your-api-key",
    "base_url": "http://localhost:11434/v1",
    "model": "openai/gpt-oss-120b",
    "temperature": 0.1,
    "max_tokens": 2000
}
```

### 依赖安装
```bash
pip install openai loguru fastapi uvicorn
```

## 🔍 故障排除

### 常见问题
1. **LLM连接失败**: 检查base_url和api_key配置
2. **JSON解析失败**: 检查模型输出格式，调整提示词
3. **置信度过低**: 优化提示词，增加上下文信息
4. **字段映射错误**: 检查字段名称是否与前端表单一致

### 调试模式
```python
# 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)
```
