// 数据验证工具

/**
 * 验证用户ID格式
 * @param {string} userId 
 * @returns {boolean}
 */
function isValidUserId(userId) {
  return userId && typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * 清理SQL注入风险的字符串
 * @param {string} str 
 * @returns {string}
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.replace(/['"\\;]/g, '');
}

/**
 * 验证数据库查询结果
 * @param {object} result 
 * @returns {boolean}
 */
function isValidQueryResult(result) {
  return result && typeof result === 'object' && result.hasOwnProperty('success');
}

module.exports = {
  isValidUserId,
  sanitizeString,
  isValidQueryResult
};
