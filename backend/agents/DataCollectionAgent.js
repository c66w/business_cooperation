/**
 * 数据收集Agent
 * 负责处理商家表单数据的收集、验证和初步处理
 */

const BaseAgent = require('./BaseAgent');
const { sanitizeString, isValidEmail, isValidPhone } = require('../utils/validators');
const { getFieldsByType } = require('../config/merchant-fields');

class DataCollectionAgent extends BaseAgent {
  constructor(config = {}) {
    super('DataCollectionAgent', config);
    
    // 从统一配置文件获取商家类型字段映射
    this.merchantTypeFields = {};
    const merchantTypes = ['factory', 'brand', 'agent', 'dealer', 'operator'];
    
    merchantTypes.forEach(type => {
      const fields = getFieldsByType(type);
      this.merchantTypeFields[type] = fields.map(field => field.field_name);
    });

    // 必填字段定义
    this.requiredFields = {
      common: ['company_name', 'product_category', 'specific_products', 'contact_name', 'contact_phone', 'merchant_type'],
      factory: ['annual_production_capacity', 'accept_deep_cooperation'],
      brand: ['brand_name', 'sales_data'],
      agent: ['agent_brand_names'],
      dealer: ['dealer_brand_names'],
      operator: ['operated_brand_names']
    };
  }

  /**
   * 处理表单数据收集任务
   * @param {Object} task - 包含表单数据的任务
   * @returns {Promise<Object>} 处理结果
   */
  async process(task) {
    const { formData, files } = task;

    // 1. 验证基础数据
    const validationResult = this.validateFormData(formData);
    if (!validationResult.isValid) {
      throw new Error(`表单验证失败: ${validationResult.errors.join(', ')}`);
    }

    // 2. 清理和标准化数据
    const cleanedData = this.sanitizeFormData(formData);

    // 3. 验证文件
    const fileValidationResult = this.validateFiles(files);
    if (!fileValidationResult.isValid) {
      throw new Error(`文件验证失败: ${fileValidationResult.errors.join(', ')}`);
    }

    // 4. 构建标准化的数据结构
    const processedData = this.buildProcessedData(cleanedData, files);

    return {
      processedData,
      validationPassed: true,
      nextStep: 'validation',
      metadata: {
        merchantType: cleanedData.merchant_type,
        fieldsCount: Object.keys(cleanedData).length,
        filesCount: files ? files.length : 0,
        processedAt: new Date()
      }
    };
  }

  /**
   * 验证表单数据
   * @param {Object} formData - 表单数据
   * @returns {Object} 验证结果
   */
  validateFormData(formData) {
    const errors = [];
    
    if (!formData || typeof formData !== 'object') {
      return { isValid: false, errors: ['表单数据格式错误'] };
    }

    // 验证通用必填字段
    for (const field of this.requiredFields.common) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        errors.push(`${field} 是必填字段`);
      }
    }

    // 验证商家类型特定字段
    const merchantType = formData.merchant_type;
    if (merchantType && this.requiredFields[merchantType]) {
      for (const field of this.requiredFields[merchantType]) {
        if (!formData[field] || formData[field].toString().trim() === '') {
          errors.push(`${field} 是${merchantType}类型的必填字段`);
        }
      }
    }

    // 验证邮箱格式
    if (formData.contact_email && !isValidEmail(formData.contact_email)) {
      errors.push('邮箱格式不正确');
    }

    // 验证手机号格式
    if (formData.contact_phone && !isValidPhone(formData.contact_phone)) {
      errors.push('手机号格式不正确');
    }

    // 验证商家类型
    if (formData.merchant_type && !Object.keys(this.merchantTypeFields).includes(formData.merchant_type)) {
      errors.push('商家类型不正确');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 清理和标准化表单数据
   * @param {Object} formData - 原始表单数据
   * @returns {Object} 清理后的数据
   */
  sanitizeFormData(formData) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          cleaned[key] = sanitizeString(value.trim());
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  /**
   * 验证上传的文件
   * @param {Array} files - 文件数组
   * @returns {Object} 验证结果
   */
  validateFiles(files) {
    const errors = [];
    
    if (!files || !Array.isArray(files)) {
      return { isValid: true, errors: [] }; // 文件不是必须的
    }

    const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      // 检查文件类型
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        errors.push(`文件 ${file.originalname} 类型不支持`);
      }

      // 检查文件大小
      if (file.size > maxSize) {
        errors.push(`文件 ${file.originalname} 大小超过限制`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 构建处理后的数据结构
   * @param {Object} cleanedData - 清理后的表单数据
   * @param {Array} files - 文件数组
   * @returns {Object} 标准化的数据结构
   */
  buildProcessedData(cleanedData, files) {
    const merchantType = cleanedData.merchant_type;
    
    // 分离通用字段和特定字段
    const commonFields = {};
    const specificFields = {};

    for (const [key, value] of Object.entries(cleanedData)) {
      if (this.requiredFields.common.includes(key) || 
          ['cooperation_requirements', 'company_introduction', 'industry_operator_contact'].includes(key)) {
        commonFields[key] = value;
      } else if (this.merchantTypeFields[merchantType] && 
                 this.merchantTypeFields[merchantType].includes(key)) {
        specificFields[key] = value;
      }
    }

    return {
      commonFields,
      specificFields,
      merchantType,
      files: files || [],
      submittedAt: new Date(),
      userId: this.generateUserId(commonFields.company_name)
    };
  }

  /**
   * 生成用户ID
   * @param {string} companyName - 公司名称
   * @returns {string} 用户ID
   */
  generateUserId(companyName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const prefix = companyName.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 获取商家类型对应的字段列表
   * @param {string} merchantType - 商家类型
   * @returns {Array} 字段列表
   */
  getMerchantTypeFields(merchantType) {
    return this.merchantTypeFields[merchantType] || [];
  }

  /**
   * 获取所有支持的商家类型
   * @returns {Array} 商家类型列表
   */
  getSupportedMerchantTypes() {
    return Object.keys(this.merchantTypeFields);
  }
}

module.exports = DataCollectionAgent;
