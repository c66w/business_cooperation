/**
 * LLM服务 - 基于OpenAI API的智能分析
 */

const { OpenAI } = require('openai');

class LLMService {
  constructor() {
    // OpenAI配置
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;

    // 只有在有API密钥时才初始化OpenAI客户端
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      });
      console.log('✅ LLM服务初始化成功');
    } else {
      console.warn('⚠️  OpenAI API密钥未配置，LLM功能将被禁用');
      this.openai = null;
    }
  }

  /**
   * 检查LLM服务状态
   */
  async checkStatus() {
    try {
      if (!this.openai) {
        return { status: 'disabled', message: 'OpenAI API密钥未配置' };
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      return { status: 'connected', model: this.model };
    } catch (error) {
      console.error('LLM服务检查失败:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 基础信息分析 - 快速提取核心信息
   */
  async analyzeBasicInfo(documentContent, currentData = {}) {
    try {
      console.log(`🤖 开始基础信息LLM分析`);
      console.log(`📄 文档内容长度: ${documentContent.length}`);
      console.log(`📊 当前表单数据:`, currentData);

      if (!this.openai) {
        throw new Error('OpenAI服务未配置，请检查API密钥和配置');
      }

      const prompt = this.buildBasicAnalysisPrompt(documentContent, currentData);
      console.log(`📝 构建的基础分析提示词长度: ${prompt.length}`);

      console.log('🔄 调用OpenAI API进行基础分析...');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的商业文档分析助手，专门负责快速提取文档中的基础信息。请严格按照JSON格式返回结果，只返回纯JSON对象。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('LLM返回空结果');
      }

      console.log(`📝 基础分析原始响应: ${analysis}`);
      const result = this.parseBasicAnalysisResult(analysis);

      console.log(`✅ 基础信息LLM分析完成，置信度: ${result.confidence_score}`);
      return result;

    } catch (error) {
      console.error('❌ 基础信息LLM分析失败:', error);
      throw new Error(`基础信息LLM分析失败: ${error.message}`);
    }
  }

  /**
   * 详细信息分析 - 根据商家类型深度分析
   */
  async analyzeDetailedInfo(documentContent, currentData = {}, merchantType = 'factory') {
    try {
      console.log(`🤖 开始详细信息LLM分析，商家类型: ${merchantType}`);
      console.log(`📄 文档内容长度: ${documentContent.length}`);
      console.log(`📊 当前表单数据:`, currentData);

      if (!this.openai) {
        throw new Error('OpenAI服务未配置，请检查API密钥和配置');
      }

      const prompt = this.buildDetailedAnalysisPrompt(documentContent, currentData, merchantType);
      console.log(`📝 构建的详细分析提示词长度: ${prompt.length}`);

      console.log('🔄 调用OpenAI API进行详细分析...');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getDetailedSystemPrompt(merchantType)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('LLM返回空结果');
      }

      console.log(`📝 详细分析原始响应: ${analysis}`);
      const result = this.parseDetailedAnalysisResult(analysis);

      console.log(`✅ 详细信息LLM分析完成，置信度: ${result.confidence_score}`);
      return result;

    } catch (error) {
      console.error('❌ 详细信息LLM分析失败:', error);
      throw new Error(`详细信息LLM分析失败: ${error.message}`);
    }
  }



  /**
   * 构建基础信息分析提示词 - 与前端basicFields对齐
   */
  buildBasicAnalysisPrompt(documentContent, currentData) {
    return `
请分析以下商业文档内容，提取基础信息字段。

文档内容：
${documentContent}

当前表单数据：
${JSON.stringify(currentData, null, 2)}

请严格按照以下JSON格式返回，只能包含指定的字段：

{
  "company_name": "公司名称",
  "product_category": "产品品类(只能选择一个：3C数码家电|本地生活|宠物生活|服饰箱包|个护家清|家居百货|礼品文创|运动户外|家装家具|酒水|美妆|母婴童装|汽摩生活|生鲜|食品饮料|手表配饰|图书教育|玩具乐器|虚拟充值|珠宝文玩|滋补保健|其它)",
  "specific_products": "具体产品",
  "contact_name": "联系人姓名",
  "contact_phone": "联系电话",
  "contact_email": "联系邮箱",
  "merchant_type": "商家类型(只能选择一个：factory|brand|agent|dealer|operator)",
  "cooperation_requirements": "合作需求(可选择：直播|短视频|共创品牌|热荔（润物云）即时零售|海外业务|私域)",
  "industry_operator_contact": "行业运营联系方式",
  "confidence_score": 0.85,
  "suggestions": ["基础信息完善建议"]
}

注意：
1. 严格按照上述字段返回，不要添加其他字段
2. 如果信息不明确请设置为null
3. merchant_type必须是：factory、brand、agent、dealer、operator之一
4. confidence_score是0-1之间的数值
5. 只返回JSON格式，不要添加任何其他文字
`;
  }

  /**
   * 解析基础信息分析结果
   */
  parseBasicAnalysisResult(analysisText) {
    try {
      console.log('🔍 基础信息LLM原始响应:', analysisText);

      // 提取JSON部分
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的基础分析结果');
      }

      const result = JSON.parse(jsonMatch[0]);
      console.log('✅ 基础信息JSON解析成功');

      // 验证和清理基础字段
      const cleanedResult = {};

      // 定义有效选项
      const validMerchantTypes = ['factory', 'brand', 'agent', 'dealer', 'operator'];
      const validProductCategories = [
        '3C数码家电', '本地生活', '宠物生活', '服饰箱包', '个护家清',
        '家居百货', '礼品文创', '运动户外', '家装家具', '酒水', '美妆',
        '母婴童装', '汽摩生活', '生鲜', '食品饮料', '手表配饰',
        '图书教育', '玩具乐器', '虚拟充值', '珠宝文玩', '滋补保健', '其它'
      ];
      const validCooperationRequirements = ['直播', '短视频', '共创品牌', '热荔（润物云）即时零售', '海外业务', '私域'];

      // 处理各个字段
      const basicFields = [
        'company_name', 'specific_products', 'contact_name',
        'contact_phone', 'contact_email', 'industry_operator_contact'
      ];

      // 普通字段处理
      basicFields.forEach(field => {
        if (result[field] !== null && result[field] !== undefined && result[field] !== '') {
          cleanedResult[field] = result[field];
        }
      });

      // merchant_type验证
      if (result.merchant_type && validMerchantTypes.includes(result.merchant_type)) {
        cleanedResult.merchant_type = result.merchant_type;
      }

      // product_category验证
      if (result.product_category) {
        // 尝试匹配有效的产品类别
        const matchedCategory = validProductCategories.find(cat =>
          result.product_category.includes(cat) || cat.includes(result.product_category)
        );
        if (matchedCategory) {
          cleanedResult.product_category = matchedCategory;
        }
      }

      // cooperation_requirements验证
      if (result.cooperation_requirements) {
        const matchedRequirement = validCooperationRequirements.find(req =>
          result.cooperation_requirements.includes(req)
        );
        if (matchedRequirement) {
          cleanedResult.cooperation_requirements = matchedRequirement;
        }
      }

      return {
        ...cleanedResult,
        confidence_score: result.confidence_score || 0.5,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };

    } catch (error) {
      console.error('基础信息解析失败:', error);
      return {
        confidence_score: 0.3,
        suggestions: ['基础信息解析失败，请检查文档格式和内容']
      };
    }
  }

  /**
   * 解析详细信息分析结果
   */
  parseDetailedAnalysisResult(analysisText) {
    try {
      console.log('🔍 详细信息LLM原始响应:', analysisText);

      // 提取JSON部分
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的详细分析结果');
      }

      const result = JSON.parse(jsonMatch[0]);
      console.log('✅ 详细信息JSON解析成功');

      // 验证和清理详细字段（只包含详细信息字段）
      const cleanedFields = {};

      Object.keys(result).forEach(key => {
        const value = result[key];
        if (value !== null && value !== undefined && value !== '' &&
            !['confidence_score', 'suggestions'].includes(key)) {
          cleanedFields[key] = value;
        }
      });

      return {
        ...cleanedFields,
        confidence_score: result.confidence_score || 0.5,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };

    } catch (error) {
      console.error('详细信息解析失败:', error);
      return {
        confidence_score: 0.3,
        suggestions: ['详细信息解析失败，请检查文档格式和内容']
      };
    }
  }

  /**
   * 生成商家类型推荐
   */
  async recommendMerchantType(documentContent) {
    try {
      const prompt = `
请分析以下商业文档内容，推荐最适合的商家类型：

文档内容：
${documentContent}

商家类型选项：
- factory: 工厂/制造商
- brand: 品牌方
- agent: 代理商
- dealer: 经销商
- operator: 运营商

请返回JSON格式：
{
  "recommended_type": "factory",
  "confidence": 0.85,
  "reasoning": "推荐理由"
}
`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个商业类型分类专家。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const result = response.choices[0]?.message?.content;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return {
          recommended_type: 'factory',
          confidence: 0.5,
          reasoning: '无法确定具体类型，默认推荐工厂类型'
        };
      }

    } catch (error) {
      console.error('商家类型推荐失败:', error);
      return {
        recommended_type: 'factory',
        confidence: 0.3,
        reasoning: '分析失败，默认推荐工厂类型'
      };
    }
  }

  /**
   * 智能填充表单字段
   */
  async smartFillForm(documentContent, formFields) {
    try {
      const fieldsDescription = formFields.map(field => 
        `${field.field_name}: ${field.field_label} (${field.field_type})`
      ).join('\n');

      const prompt = `
请从以下文档内容中提取信息，填充表单字段：

文档内容：
${documentContent}

需要填充的字段：
${fieldsDescription}

请返回JSON格式：
{
  "filled_fields": {
    "field_name": "extracted_value"
  },
  "confidence_scores": {
    "field_name": 0.85
  }
}
`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个智能表单填充助手。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      const result = response.choices[0]?.message?.content;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return {
          filled_fields: {},
          confidence_scores: {}
        };
      }

    } catch (error) {
      console.error('智能填充失败:', error);
      return {
        filled_fields: {},
        confidence_scores: {},
        error: error.message
      };
    }
  }

  /**
   * 构建详细信息分析提示词
   */
  buildDetailedAnalysisPrompt(documentContent, currentData, merchantType) {
    const merchantPrompts = {
      factory: this.getFactoryPrompt(),
      brand: this.getBrandPrompt(),
      agent: this.getAgentPrompt(),
      dealer: this.getDealerPrompt(),
      operator: this.getOperatorPrompt()
    };

    const specificPrompt = merchantPrompts[merchantType] || merchantPrompts.factory;

    return `
请深度分析以下商业文档内容，提取详细的${this.getMerchantTypeName(merchantType)}信息。

文档内容：
${documentContent}

当前表单数据：
${JSON.stringify(currentData, null, 2)}

商家类型：${merchantType}

${specificPrompt}

请按照以下JSON格式返回详细分析结果（扁平化结构），只包含详细信息字段：

{
  "company_address": "公司详细地址",
  "company_description": "公司简介"${this.getExtractedFieldsTemplate(merchantType) ? ',' + this.getExtractedFieldsTemplate(merchantType) : ''},
  "confidence_score": 0.85,
  "suggestions": ["针对${this.getMerchantTypeName(merchantType)}的专业建议"]
}

注意：
1. 深度分析${this.getMerchantTypeName(merchantType)}的专业信息
2. confidence_score是0-1之间的数值
3. suggestions应该针对${this.getMerchantTypeName(merchantType)}的业务特点提出专业建议
4. 只返回JSON格式，不要添加其他文字
`;
  }

  /**
   * 获取详细分析的系统提示词
   */
  getDetailedSystemPrompt(merchantType) {
    const systemPrompts = {
      factory: '你是一个专业的制造业分析师，擅长分析工厂的生产能力、质量体系、供应链管理等信息。',
      brand: '你是一个专业的品牌分析师，擅长分析品牌价值、市场定位、产品线等信息。',
      agent: '你是一个专业的代理业务分析师，擅长分析代理资质、渠道能力、市场覆盖等信息。',
      dealer: '你是一个专业的经销业务分析师，擅长分析经销网络、库存管理、销售能力等信息。',
      operator: '你是一个专业的运营分析师，擅长分析运营模式、服务能力、技术实力等信息。'
    };

    return systemPrompts[merchantType] || systemPrompts.factory + ' 请严格按照JSON格式返回结果，只返回纯JSON对象。';
  }

  /**
   * 获取商家类型中文名称
   */
  getMerchantTypeName(merchantType) {
    const typeNames = {
      factory: '工厂/制造商',
      brand: '品牌方',
      agent: '代理商',
      dealer: '经销商',
      operator: '运营商'
    };
    return typeNames[merchantType] || '商家';
  }



  /**
   * 工厂/制造商专门提示
   */
  getFactoryPrompt() {
    return `
作为工厂/制造商，请重点关注以下信息：

核心业务信息：
- 具体产品：主要生产的产品类型和规格
- 自有品牌：是否有自主品牌，品牌名称
- 自有品牌运营能力：店铺运营、客服、物流等能力
- 代工知名品牌：为哪些知名品牌代工生产
- 年生产规模：最大产出能力，产能优势

生产能力：
- 年产量、生产线数量、设备情况
- 质量体系：ISO认证、质量控制流程
- 工厂规模：厂房面积、员工数量、技术人员比例
- 生产工艺：核心技术、工艺流程、技术优势

合作意向：
- 是否需要开模或改包装，预计时间
- 是否接受品牌共创（品牌属于遥望或遥望合资公司）
- 是否接受深度合作
- 是否接受线上/全渠道独家
- 是否接受遥望授权其他渠道
- 是否接受后续全渠道分红

请特别关注提取这些具体字段的信息。
`;
  }

  /**
   * 品牌方专门提示
   */
  getBrandPrompt() {
    return `
作为品牌方，请重点关注以下信息：

核心业务信息：
- 品牌名称：具体的品牌名称
- 品牌知名度：市场影响力、第三方平台店铺情况
- 销售数据：线上销售、店铺自播、线下商超销售数据
- 合作预算：日常销售或营销预算投入

品牌价值：
- 品牌历史、品牌定位、市场影响力
- 产品线：主要产品系列、产品特色、创新能力
- 市场表现：销售渠道、市场份额、销售业绩
- 知识产权：商标、专利、设计版权
- 营销能力：广告投入、推广策略、品牌活动
- 合作伙伴：代理商网络、零售合作伙伴
- 研发投入：研发团队、新品开发、技术创新

请特别关注提取这些具体字段的信息。
`;
  }

  /**
   * 代理商专门提示
   */
  getAgentPrompt() {
    return `
作为代理商，请重点关注以下信息：

核心业务信息：
- 代理的品牌名称：具体代理的品牌名称（没有填无）
- 品牌知名度：市场影响力、第三方平台店铺首页情况
- 销售数据：线上销售、历史合作主播、线下商超销售数据
- 合作预算：日常销售或营销预算投入

代理业务：
- 代理资质：代理证书、授权范围、代理级别
- 代理品牌：代理的品牌列表、品牌知名度
- 市场覆盖：覆盖区域、销售网络、渠道布局
- 销售能力：销售团队、销售业绩、客户资源
- 仓储物流：仓库规模、物流配送能力
- 服务能力：售前售后服务、技术支持
- 合作历史：代理年限、合作稳定性、业绩表现

请特别关注提取这些具体字段的信息。
`;
  }

  /**
   * 经销商专门提示
   */
  getDealerPrompt() {
    return `
作为经销商，请重点关注以下信息：

核心业务信息：
- 经销的品牌名称：具体经销的品牌名称（没有填无）
- 品牌知名度：市场影响力、第三方平台店铺首页情况
- 销售数据：线上销售、历史合作主播、线下商超销售数据
- 合作预算：日常销售或营销预算投入

经销业务：
- 经销网络：门店数量、网点分布、覆盖范围
- 库存管理：库存规模、周转率、供应链效率
- 销售渠道：线上线下渠道、零售终端
- 客户群体：目标客户、客户类型、客户忠诚度
- 价格体系：定价策略、促销活动、价格竞争力
- 服务网络：售后服务点、维修能力、客户服务
- 市场推广：本地化营销、推广活动、市场开拓

请特别关注提取这些具体字段的信息。
`;
  }

  /**
   * 运营商专门提示
   */
  getOperatorPrompt() {
    return `
作为运营商，请重点关注以下信息：

核心业务信息：
- 代运营的品牌名称：具体代运营的品牌名称
- 品牌知名度：市场影响力、第三方平台店铺首页情况
- 销售数据：线上销售、店铺自播、线下商超销售数据
- 合作预算：近期日常销售或营销预算可投入的具体金额

运营业务：
- 运营模式：业务模式、服务类型、运营策略
- 技术实力：技术团队、技术平台、系统能力
- 服务能力：服务范围、服务质量、客户满意度
- 运营规模：用户数量、业务量、市场份额
- 合规资质：运营许可、行业认证、合规状况
- 数据安全：数据保护、安全认证、隐私合规
- 创新能力：技术创新、产品创新、模式创新

请特别关注提取这些具体字段的信息。
`;
  }

  /**
   * 获取extracted_fields模板 - 对应server.js中的typeSpecificFields
   */
  getExtractedFieldsTemplate(merchantType) {
    const templates = {
      factory: `
    "own_brand": "自有品牌",
    "own_brand_operation_capability": "自有品牌运营能力",
    "oem_brands": "代工的知名品牌",
    "annual_production_capacity": "年生产规模（产能优势）",
    "need_mold_modification": "是否需要开模或修改包装",
    "mold_modification_time": "预计开模或修改包装需要时间",
    "accept_deep_cooperation": "是否接受和遥望深度合作",
    "accept_brand_co_creation": "是否接受品牌共创",
    "accept_exclusive_authorization": "是否接受线上或全渠道的独家授权",
    "accept_other_channel_authorization": "是否接受遥望授权其他渠道售卖",
    "accept_channel_profit_sharing": "是否接受后续全渠道分红"`,
      brand: `
    "brand_name": "品牌名称",
    "brand_awareness": "品牌知名度",
    "sales_data": "销售数据",
    "cooperation_budget": "合作预算"`,
      agent: `
    "agent_brand_names": "代理的品牌名称",
    "brand_awareness": "品牌知名度",
    "sales_data": "销售数据",
    "cooperation_budget": "合作预算"`,
      dealer: `
    "dealer_brand_names": "经销的品牌名称",
    "brand_awareness": "品牌知名度",
    "sales_data": "销售数据",
    "cooperation_budget": "合作预算"`,
      operator: `
    "operated_brand_names": "代运营的品牌名称",
    "brand_awareness": "品牌知名度",
    "sales_data": "销售数据",
    "cooperation_budget": "合作预算"`
    };
    return templates[merchantType] || '';
  }


}

module.exports = LLMService;
