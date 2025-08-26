const express = require('express');
const AuthService = require('../services/AuthService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const result = await authService.login(username, password);

    console.log(`✅ 用户登录成功: ${username} (${result.user.role})`);

    res.json(result);

  } catch (error) {
    console.error('登录失败:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 用户登出
 */
router.post('/logout', authenticateToken, (req, res) => {
  // JWT是无状态的，客户端删除token即可
  console.log(`✅ 用户登出: ${req.user.username}`);
  
  res.json({
    success: true,
    message: '登出成功'
  });
});

/**
 * 获取当前用户信息
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role
    }
  });
});

/**
 * 修改密码
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '原密码和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6位'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const result = await authService.changePassword(req.user.userId, oldPassword, newPassword);

    console.log(`✅ 用户修改密码成功: ${req.user.username}`);

    res.json(result);

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 创建用户（仅管理员）
 */
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;

    // 验证必填字段
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: '用户名、密码、姓名和角色不能为空'
      });
    }

    // 验证角色
    const validRoles = ['admin', 'reviewer', 'merchant'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户角色'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const result = await authService.createUser({
      username, password, name, email, role
    }, req.user.role);

    console.log(`✅ 管理员创建用户成功: ${username} (${role})`);

    res.json(result);

  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取用户列表（仅管理员）
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const users = await authService.getUsers(req.user.role);

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 更新用户状态（仅管理员）
 */
router.put('/users/:userId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '状态值必须为布尔类型'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const result = await authService.updateUserStatus(userId, isActive, req.user.role);

    console.log(`✅ 管理员更新用户状态: ${userId} -> ${isActive ? '启用' : '禁用'}`);

    res.json(result);

  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 删除用户（仅管理员）
 */
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 防止删除自己
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const authService = new AuthService({ execute });

    const result = await authService.deleteUser(userId, req.user.role);

    console.log(`✅ 管理员删除用户: ${userId}`);

    res.json(result);

  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
