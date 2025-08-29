/**
 * 商家类型工具函数
 * 统一管理商家类型的显示名称映射
 */

/**
 * 商家类型显示名称映射
 */
export const MERCHANT_TYPE_DISPLAY_MAP = {
  'factory': '🏭 生产工厂',
  'brand': '🏷️ 品牌商',
  'agent': '🤝 代理商',
  'dealer': '📦 经销商',
  'operator': '🔧 代运营商'
};

/**
 * 获取商家类型的显示名称
 * @param {string} type - 商家类型代码
 * @returns {string} 显示名称
 */
export const getMerchantTypeDisplayName = (type) => {
  return MERCHANT_TYPE_DISPLAY_MAP[type] || type;
};

/**
 * 获取所有商家类型选项
 * @returns {Array} 商家类型选项数组
 */
export const getMerchantTypeOptions = () => {
  return Object.entries(MERCHANT_TYPE_DISPLAY_MAP).map(([value, label]) => ({
    value,
    label
  }));
};

/**
 * 验证商家类型是否有效
 * @param {string} type - 商家类型代码
 * @returns {boolean} 是否有效
 */
export const isValidMerchantType = (type) => {
  return Object.keys(MERCHANT_TYPE_DISPLAY_MAP).includes(type);
};
