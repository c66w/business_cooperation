const AuthService = require('../services/AuthService');

/**
 * JWT认证中间件
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '缺少访问令牌'
    });
  }

  try {
    // 开发模式：支持简单token
    if (token.startsWith('test-token') || token.startsWith('demo-token')) {
      console.log('🔓 开发模式认证通过:', token.substring(0, 20) + '...');
      req.user = {
        userId: 'demo-user',
        username: 'demo',
        role: 'merchant'
      };
      return next();
    }

    // 生产模式：JWT验证
    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证失败:', error.message);
    return res.status(403).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
}

/**
 * 角色权限检查中间件
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    if (!authService.checkPermission(req.user.role, requiredRole)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

/**
 * 管理员权限检查
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * 审核员权限检查
 */
function requireReviewer(req, res, next) {
  return requireRole('reviewer')(req, res, next);
}

/**
 * 商家权限检查
 */
function requireMerchant(req, res, next) {
  return requireRole('merchant')(req, res, next);
}

/**
 * 可选认证中间件（不强制要求登录）
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const { execute } = require('../config/database-sqlite');
      const authService = new AuthService({ execute });
      
      const decoded = authService.verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // 忽略token验证错误，继续处理请求
      req.user = null;
    }
  }

  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireReviewer,
  requireMerchant,
  optionalAuth
};
