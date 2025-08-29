/**
 * 商家类型字段配置 - 前端版本
 * 与后端配置保持一致，确保前后端字段配置统一
 */

export const MERCHANT_TYPE_FIELDS = {
  factory: [
    {
      name: 'own_brand',
      label: '自有品牌',
      type: 'text',
      required: false,
      order: 1
    },
    {
      name: 'own_brand_operation_capability',
      label: '自有品牌运营能力',
      type: 'textarea',
      required: false,
      order: 2
    },
    {
      name: 'oem_brands',
      label: '代工的知名品牌',
      type: 'textarea',
      required: false,
      order: 3
    },
    {
      name: 'annual_production_capacity',
      label: '年生产规模（产能优势）',
      type: 'text',
      required: true,
      order: 4
    },
    {
      name: 'need_mold_modification',
      label: '是否需要开模或修改包装',
      type: 'radio',
      required: false,
      options: ['是', '否', '未确认'],
      order: 5
    },
    {
      name: 'mold_modification_time',
      label: '预计开模或修改包装需要时间',
      type: 'text',
      required: false,
      order: 6
    },
    {
      name: 'accept_deep_cooperation',
      label: '是否接受和遥望深度合作',
      type: 'radio',
      required: true,
      options: ['是', '否'],
      order: 7
    },
    {
      name: 'accept_brand_co_creation',
      label: '是否接受品牌共创',
      type: 'radio',
      required: false,
      options: ['是', '否'],
      order: 8
    },
    {
      name: 'accept_exclusive_authorization',
      label: '是否接受线上或全渠道的独家授权',
      type: 'radio',
      required: false,
      options: ['是', '否'],
      order: 9
    },
    {
      name: 'accept_other_channel_authorization',
      label: '是否接受遥望授权其他渠道售卖',
      type: 'radio',
      required: false,
      options: ['是', '否'],
      order: 10
    },
    {
      name: 'accept_channel_profit_sharing',
      label: '是否接受后续全渠道分红',
      type: 'radio',
      required: false,
      options: ['是', '否'],
      order: 11
    }
  ],

  brand: [
    {
      name: 'brand_name',
      label: '品牌名称',
      type: 'text',
      required: true,
      order: 1
    },
    {
      name: 'brand_awareness',
      label: '品牌知名度',
      type: 'textarea',
      required: false,
      placeholder: '可上传第三方平台店铺的首页截图',
      order: 2
    },
    {
      name: 'sales_data',
      label: '销售数据',
      type: 'textarea',
      required: true,
      placeholder: '品牌线上销售数据、店铺自播数据、线下商超销售数据',
      order: 3
    },
    {
      name: 'cooperation_budget',
      label: '合作预算',
      type: 'text',
      required: false,
      placeholder: '日常销售或营销预算投入',
      order: 4
    }
  ],

  agent: [
    {
      name: 'agent_brand_names',
      label: '代理的品牌名称',
      type: 'textarea',
      required: true,
      placeholder: '没有填无，有就填写代理的具体品牌名称',
      order: 1
    },
    {
      name: 'brand_awareness',
      label: '品牌知名度',
      type: 'textarea',
      required: false,
      placeholder: '可上传第三方平台店铺的首页截图',
      order: 2
    },
    {
      name: 'sales_data',
      label: '销售数据',
      type: 'textarea',
      required: false,
      placeholder: '品牌线上销售、历史合作主播数据、线下商超销售数据',
      order: 3
    },
    {
      name: 'cooperation_budget',
      label: '合作预算',
      type: 'text',
      required: false,
      placeholder: '日常销售或营销预算投入',
      order: 4
    }
  ],

  dealer: [
    {
      name: 'dealer_brand_names',
      label: '经销的品牌名称',
      type: 'textarea',
      required: true,
      placeholder: '没有填无，有就填写经销品牌名称',
      order: 1
    },
    {
      name: 'brand_awareness',
      label: '品牌知名度',
      type: 'textarea',
      required: false,
      placeholder: '可上传第三方平台店铺的首页截图',
      order: 2
    },
    {
      name: 'sales_data',
      label: '销售数据',
      type: 'textarea',
      required: false,
      placeholder: '品牌线上销售、历史合作主播数据、线下商超销售数据',
      order: 3
    },
    {
      name: 'cooperation_budget',
      label: '合作预算',
      type: 'text',
      required: false,
      placeholder: '日常销售或营销预算投入',
      order: 4
    }
  ],

  operator: [
    {
      name: 'operated_brand_names',
      label: '代运营的品牌名称',
      type: 'textarea',
      required: true,
      placeholder: '填写代运营的品牌名称',
      order: 1
    },
    {
      name: 'brand_awareness',
      label: '品牌知名度',
      type: 'textarea',
      required: false,
      placeholder: '可上传第三方平台店铺的首页截图',
      order: 2
    },
    {
      name: 'sales_data',
      label: '销售数据',
      type: 'textarea',
      required: true,
      placeholder: '品牌线上销售、店铺自播数据、线下商超销售数据',
      order: 3
    },
    {
      name: 'cooperation_budget',
      label: '合作预算',
      type: 'text',
      required: true,
      placeholder: '近期日常销售或营销预算可投入的具体金额',
      order: 4
    }
  ]
};

/**
 * 获取指定商家类型的字段配置
 * @param {string} merchantType - 商家类型
 * @returns {Array} 字段配置数组
 */
export function getFieldsByType(merchantType) {
  return MERCHANT_TYPE_FIELDS[merchantType] || [];
}

/**
 * 获取所有商家类型
 * @returns {Array} 商家类型数组
 */
export function getAllMerchantTypes() {
  return Object.keys(MERCHANT_TYPE_FIELDS);
}

/**
 * 获取字段配置的默认值
 * @param {string} merchantType - 商家类型
 * @returns {Object} 字段默认值对象
 */
export function getDefaultValues(merchantType) {
  const fields = getFieldsByType(merchantType);
  const defaults = {};
  
  fields.forEach(field => {
    if (field.type === 'radio' && field.options && field.options.length > 0) {
      defaults[field.name] = field.options[0]; // 默认选择第一个选项
    } else if (field.type === 'checkbox') {
      defaults[field.name] = []; // 默认为空数组
    } else {
      defaults[field.name] = ''; // 默认为空字符串
    }
  });
  
  return defaults;
} 