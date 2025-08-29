/**
 * 商家类型字段配置
 * 统一管理所有商家类型的动态字段配置
 * 确保前端、后端、数据库配置一致
 */

const MERCHANT_TYPE_FIELDS = {
  factory: [
    {
      field_name: 'own_brand',
      field_label: '自有品牌',
      field_type: 'text',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 1
    },
    {
      field_name: 'own_brand_operation_capability',
      field_label: '自有品牌运营能力',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 2
    },
    {
      field_name: 'oem_brands',
      field_label: '代工的知名品牌',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 3
    },
    {
      field_name: 'annual_production_capacity',
      field_label: '年生产规模（产能优势）',
      field_type: 'text',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 4
    },
    {
      field_name: 'need_mold_modification',
      field_label: '是否需要开模或修改包装',
      field_type: 'radio',
      field_options: ['是', '否', '未确认'],
      is_required: false,
      validation_rules: null,
      display_order: 5
    },
    {
      field_name: 'mold_modification_time',
      field_label: '预计开模或修改包装需要时间',
      field_type: 'text',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 6
    },
    {
      field_name: 'accept_deep_cooperation',
      field_label: '是否接受和遥望深度合作',
      field_type: 'radio',
      field_options: ['是', '否'],
      is_required: true,
      validation_rules: null,
      display_order: 7
    },
    {
      field_name: 'accept_brand_co_creation',
      field_label: '是否接受品牌共创',
      field_type: 'radio',
      field_options: ['是', '否'],
      is_required: false,
      validation_rules: null,
      display_order: 8
    },
    {
      field_name: 'accept_exclusive_authorization',
      field_label: '是否接受线上或全渠道的独家授权',
      field_type: 'radio',
      field_options: ['是', '否'],
      is_required: false,
      validation_rules: null,
      display_order: 9
    },
    {
      field_name: 'accept_other_channel_authorization',
      field_label: '是否接受遥望授权其他渠道售卖',
      field_type: 'radio',
      field_options: ['是', '否'],
      is_required: false,
      validation_rules: null,
      display_order: 10
    },
    {
      field_name: 'accept_channel_profit_sharing',
      field_label: '是否接受后续全渠道分红',
      field_type: 'radio',
      field_options: ['是', '否'],
      is_required: false,
      validation_rules: null,
      display_order: 11
    }
  ],

  brand: [
    {
      field_name: 'brand_name',
      field_label: '品牌名称',
      field_type: 'text',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 1
    },
    {
      field_name: 'brand_awareness',
      field_label: '品牌知名度',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 2
    },
    {
      field_name: 'sales_data',
      field_label: '销售数据',
      field_type: 'textarea',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 3
    },
    {
      field_name: 'cooperation_budget',
      field_label: '合作预算',
      field_type: 'text',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 4
    }
  ],

  agent: [
    {
      field_name: 'agent_brand_names',
      field_label: '代理的品牌名称',
      field_type: 'textarea',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 1
    },
    {
      field_name: 'brand_awareness',
      field_label: '品牌知名度',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 2
    },
    {
      field_name: 'sales_data',
      field_label: '销售数据',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 3
    },
    {
      field_name: 'cooperation_budget',
      field_label: '合作预算',
      field_type: 'text',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 4
    }
  ],

  dealer: [
    {
      field_name: 'dealer_brand_names',
      field_label: '经销的品牌名称',
      field_type: 'textarea',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 1
    },
    {
      field_name: 'brand_awareness',
      field_label: '品牌知名度',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 2
    },
    {
      field_name: 'sales_data',
      field_label: '销售数据',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 3
    },
    {
      field_name: 'cooperation_budget',
      field_label: '合作预算',
      field_type: 'text',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 4
    }
  ],

  operator: [
    {
      field_name: 'operated_brand_names',
      field_label: '代运营的品牌名称',
      field_type: 'textarea',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 1
    },
    {
      field_name: 'brand_awareness',
      field_label: '品牌知名度',
      field_type: 'textarea',
      field_options: null,
      is_required: false,
      validation_rules: null,
      display_order: 2
    },
    {
      field_name: 'sales_data',
      field_label: '销售数据',
      field_type: 'textarea',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 3
    },
    {
      field_name: 'cooperation_budget',
      field_label: '合作预算',
      field_type: 'text',
      field_options: null,
      is_required: true,
      validation_rules: null,
      display_order: 4
    }
  ]
};

/**
 * 获取指定商家类型的字段配置
 * @param {string} merchantType - 商家类型
 * @returns {Array} 字段配置数组
 */
function getFieldsByType(merchantType) {
  return MERCHANT_TYPE_FIELDS[merchantType] || [];
}

/**
 * 获取所有商家类型
 * @returns {Array} 商家类型数组
 */
function getAllMerchantTypes() {
  return Object.keys(MERCHANT_TYPE_FIELDS);
}

/**
 * 获取字段配置的数据库插入格式
 * @param {string} merchantType - 商家类型
 * @returns {Array} 数据库插入格式的数组
 */
function getFieldsForDatabaseInsert(merchantType) {
  const fields = getFieldsByType(merchantType);
  return fields.map(field => [
    merchantType,
    field.field_name,
    field.field_label,
    field.field_type,
    field.field_options ? JSON.stringify(field.field_options) : null,
    field.is_required ? 1 : 0,
    field.validation_rules ? JSON.stringify(field.validation_rules) : null,
    field.display_order,
    1 // is_active
  ]);
}

/**
 * 获取前端表单格式的字段配置
 * @param {string} merchantType - 商家类型
 * @returns {Array} 前端表单格式的数组
 */
function getFieldsForFrontend(merchantType) {
  const fields = getFieldsByType(merchantType);
  return fields.map(field => ({
    name: field.field_name,
    label: field.field_label,
    type: field.field_type,
    options: field.field_options,
    required: field.is_required,
    order: field.display_order
  }));
}

module.exports = {
  MERCHANT_TYPE_FIELDS,
  getFieldsByType,
  getAllMerchantTypes,
  getFieldsForDatabaseInsert,
  getFieldsForFrontend
}; 