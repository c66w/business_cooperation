/**
 * 验证Agent
 * 负责对收集到的数据进行深度验证和业务规则检查
 */

const BaseAgent = require('./BaseAgent');
const axios = require('axios');

class ValidationAgent extends BaseAgent {
  constructor(config = {}) {
    super('ValidationAgent', config);
    
    // 验证规则配置
    this.validationRules = {
      company_name: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\(\)\-\.]+$/
      },
      contact_phone: {
        pattern: /^1[3-9]\d{9}$/
      },
      contact_email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      product_category: {
        allowedValues: [
          '3C数码家电',
          '本地生活',
          '宠物生活',
          '服饰箱包',
          '个护家清',
          '家居百货',
          '礼品文创',
          '运动户外',
          '家装家具',
          '酒水',
          '美妆',
          '母婴童装',
          '汽摩生活',
          '生鲜',
          '食品饮料',
          '手表配饰',
          '图书教育',
          '玩具乐器',
          '虚拟充值',
          '珠宝文玩',
          '滋补保健',
          '其它'
        ]
      }
    };

    // 业务规则配置
    this.businessRules = {
      factory: {
        annual_production_capacity: {
          type: 'string', // 改为字符串类型，因为可能包含描述性文字
          minLength: 1,
          message: '年生产规模不能为空'
        }
      },
      brand: {
        cooperation_budget: {
          type: 'string',
          minLength: 1,
          message: '合作预算不能为空'
        }
      }
    };
  }

  /**
   * 处理验证任务
   * @param {Object} task - 验证任务
   * @returns {Promise<Object>} 验证结果
   */
  async process(task) {
    const { processedData } = task;

    // 1. 基础数据验证
    const basicValidation = await this.performBasicValidation(processedData);
    if (!basicValidation.isValid) {
      throw new Error(`基础验证失败: ${basicValidation.errors.join(', ')}`);
    }

    // 2. 业务规则验证
    const businessValidation = await this.performBusinessValidation(processedData);
    if (!businessValidation.isValid) {
      throw new Error(`业务规则验证失败: ${businessValidation.errors.join(', ')}`);
    }

    // 3. 外部数据验证（如企业信息查询）
    const externalValidation = await this.performExternalValidation(processedData);
    
    // 4. 文件验证
    const fileValidation = await this.performFileValidation(processedData.files);

    // 5. 计算验证分数
    const validationScore = this.calculateValidationScore({
      basicValidation,
      businessValidation,
      externalValidation,
      fileValidation
    });

    return {
      validationPassed: validationScore >= 80,
      validationScore,
      validationDetails: {
        basic: basicValidation,
        business: businessValidation,
        external: externalValidation,
        files: fileValidation
      },
      nextStep: validationScore >= 80 ? 'review' : 'manual_review',
      recommendations: this.generateRecommendations(validationScore, {
        basicValidation,
        businessValidation,
        externalValidation,
        fileValidation
      })
    };
  }

  /**
   * 执行基础数据验证
   * @param {Object} data - 处理后的数据
   * @returns {Promise<Object>} 验证结果
   */
  async performBasicValidation(data) {
    const errors = [];
    const warnings = [];
    const { commonFields, specificFields } = data;

    // 验证通用字段
    for (const [field, value] of Object.entries(commonFields)) {
      const rule = this.validationRules[field];
      if (rule) {
        const fieldValidation = this.validateField(field, value, rule);
        if (!fieldValidation.isValid) {
          errors.push(...fieldValidation.errors);
        }
        if (fieldValidation.warnings) {
          warnings.push(...fieldValidation.warnings);
        }
      }
    }

    // 验证特定字段
    for (const [field, value] of Object.entries(specificFields)) {
      if (value && typeof value === 'string' && value.length > 1000) {
        warnings.push(`${field} 内容过长，建议精简`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 20)
    };
  }

  /**
   * 验证单个字段
   * @param {string} fieldName - 字段名
   * @param {*} value - 字段值
   * @param {Object} rule - 验证规则
   * @returns {Object} 验证结果
   */
  validateField(fieldName, value, rule) {
    const errors = [];
    const warnings = [];

    if (!value) {
      return { isValid: true, errors, warnings };
    }

    // 长度验证
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${fieldName} 长度不能少于 ${rule.minLength} 个字符`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${fieldName} 长度不能超过 ${rule.maxLength} 个字符`);
    }

    // 格式验证
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${fieldName} 格式不正确`);
    }

    // 枚举值验证
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push(`${fieldName} 值不在允许范围内`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 执行业务规则验证
   * @param {Object} data - 处理后的数据
   * @returns {Promise<Object>} 验证结果
   */
  async performBusinessValidation(data) {
    const errors = [];
    const warnings = [];
    const { merchantType, specificFields } = data;

    const typeRules = this.businessRules[merchantType];
    if (typeRules) {
      for (const [field, rule] of Object.entries(typeRules)) {
        const value = specificFields[field];
        if (value !== undefined && value !== null) {
          const ruleValidation = this.validateBusinessRule(field, value, rule);
          if (!ruleValidation.isValid) {
            errors.push(...ruleValidation.errors);
          }
          if (ruleValidation.warnings) {
            warnings.push(...ruleValidation.warnings);
          }
        }
      }
    }

    // 特殊业务逻辑验证
    const specialValidation = await this.performSpecialBusinessValidation(data);
    errors.push(...specialValidation.errors);
    warnings.push(...specialValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 15)
    };
  }

  /**
   * 验证业务规则
   * @param {string} field - 字段名
   * @param {*} value - 字段值
   * @param {Object} rule - 业务规则
   * @returns {Object} 验证结果
   */
  validateBusinessRule(field, value, rule) {
    const errors = [];
    const warnings = [];

    if (rule.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${field} 必须是数字`);
      } else {
        if (rule.min && numValue < rule.min) {
          errors.push(rule.message || `${field} 不能小于 ${rule.min}`);
        }
        if (rule.max && numValue > rule.max) {
          errors.push(rule.message || `${field} 不能大于 ${rule.max}`);
        }
      }
    } else if (rule.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${field} 必须是字符串`);
      } else {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(rule.message || `${field} 长度不能少于 ${rule.minLength} 个字符`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(rule.message || `${field} 长度不能超过 ${rule.maxLength} 个字符`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 执行特殊业务验证
   * @param {Object} data - 数据
   * @returns {Promise<Object>} 验证结果
   */
  async performSpecialBusinessValidation(data) {
    const errors = [];
    const warnings = [];

    // 工厂类型特殊验证
    if (data.merchantType === 'factory') {
      if (data.specificFields.accept_deep_cooperation === 'false' && 
          data.specificFields.accept_brand_co_creation === 'false') {
        warnings.push('建议至少接受一种深度合作方式以提高合作机会');
      }
    }

    // 品牌商特殊验证
    if (data.merchantType === 'brand') {
      if (!data.specificFields.brand_name || data.specificFields.brand_name.length < 2) {
        errors.push('品牌名称不能为空且长度不能少于2个字符');
      }
    }

    return { errors, warnings };
  }

  /**
   * 执行外部数据验证
   * @param {Object} data - 数据
   * @returns {Promise<Object>} 验证结果
   */
  async performExternalValidation(data) {
    const warnings = [];
    let score = 80; // 默认分数

    try {
      // 这里可以集成企业信息查询API
      // const companyInfo = await this.queryCompanyInfo(data.commonFields.company_name);
      // 暂时模拟验证
      
      const companyName = data.commonFields.company_name;
      if (companyName.includes('测试') || companyName.includes('test')) {
        warnings.push('公司名称疑似测试数据');
        score -= 20;
      }

      return {
        isValid: true,
        warnings,
        score,
        externalData: null // 外部查询到的数据
      };
    } catch (error) {
      console.warn('外部验证失败:', error.message);
      return {
        isValid: true,
        warnings: ['外部数据验证暂时不可用'],
        score: 60
      };
    }
  }

  /**
   * 执行文件验证
   * @param {Array} files - 文件数组
   * @returns {Promise<Object>} 验证结果
   */
  async performFileValidation(files) {
    const warnings = [];
    let score = files && files.length > 0 ? 100 : 60;

    if (!files || files.length === 0) {
      warnings.push('未上传任何资质文档');
    } else if (files.length < 2) {
      warnings.push('建议上传更多资质文档以提高审核通过率');
      score = 80;
    }

    return {
      isValid: true,
      warnings,
      score,
      fileCount: files ? files.length : 0
    };
  }

  /**
   * 计算总体验证分数
   * @param {Object} validationResults - 各项验证结果
   * @returns {number} 总分
   */
  calculateValidationScore(validationResults) {
    const weights = {
      basic: 0.4,
      business: 0.3,
      external: 0.2,
      files: 0.1
    };

    let totalScore = 0;
    for (const [type, result] of Object.entries(validationResults)) {
      const weight = weights[type] || 0;
      const score = result.score || 0;
      totalScore += score * weight;
    }

    return Math.round(totalScore);
  }

  /**
   * 生成改进建议
   * @param {number} score - 验证分数
   * @param {Object} validationResults - 验证结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(score, validationResults) {
    const recommendations = [];

    if (score < 60) {
      recommendations.push('数据质量较低，建议重新填写表单');
    } else if (score < 80) {
      recommendations.push('数据基本符合要求，但仍有改进空间');
    }

    // 收集所有警告作为建议
    for (const result of Object.values(validationResults)) {
      if (result.warnings) {
        recommendations.push(...result.warnings);
      }
    }

    return recommendations;
  }
}

module.exports = ValidationAgent;
