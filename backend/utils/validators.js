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

/**
 * 验证邮箱格式
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

module.exports = {
  isValidUserId,
  sanitizeString,
  isValidQueryResult,
  isValidEmail,
  isValidPhone
};
