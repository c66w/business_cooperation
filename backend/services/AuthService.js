const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * 用户认证服务
 */
class AuthService {
  constructor(db) {
    this.db = db;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.saltRounds = 10;
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      // 查找用户
      const users = await this.db.execute(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username]
      );

      if (users.length === 0) {
        throw new Error('用户名或密码错误');
      }

      const user = users[0];

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('用户名或密码错误');
      }

      // 生成JWT token
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          role: user.role,
          name: user.name
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // 更新最后登录时间
      await this.db.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
        [user.user_id]
      );

      return {
        success: true,
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email
        }
      };

    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 验证JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('无效的token');
    }
  }

  /**
   * 创建用户（仅管理员可用）
   */
  async createUser(userData, creatorRole) {
    if (creatorRole !== 'admin') {
      throw new Error('权限不足');
    }

    try {
      const { username, password, name, email, role } = userData;

      // 检查用户名是否已存在
      const existingUsers = await this.db.execute(
        'SELECT user_id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        throw new Error('用户名已存在');
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, this.saltRounds);

      // 生成用户ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 插入用户
      await this.db.execute(`
        INSERT INTO users 
        (user_id, username, password_hash, name, email, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)
      `, [userId, username, passwordHash, name, email, role]);

      return {
        success: true,
        userId,
        message: '用户创建成功'
      };

    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表（仅管理员可用）
   */
  async getUsers(requestorRole) {
    if (requestorRole !== 'admin') {
      throw new Error('权限不足');
    }

    try {
      const users = await this.db.execute(`
        SELECT user_id, username, name, email, role, is_active, created_at, last_login
        FROM users
        ORDER BY created_at DESC
      `);

      return users;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户状态（仅管理员可用）
   */
  async updateUserStatus(userId, isActive, requestorRole) {
    if (requestorRole !== 'admin') {
      throw new Error('权限不足');
    }

    try {
      await this.db.execute(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [isActive, userId]
      );

      return {
        success: true,
        message: `用户已${isActive ? '启用' : '禁用'}`
      };
    } catch (error) {
      console.error('更新用户状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户（仅管理员可用）
   */
  async deleteUser(userId, requestorRole) {
    if (requestorRole !== 'admin') {
      throw new Error('权限不足');
    }

    try {
      // 软删除：设置为非活跃状态
      await this.db.execute(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [userId]
      );

      return {
        success: true,
        message: '用户已删除'
      };
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // 获取用户当前密码
      const users = await this.db.execute(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('用户不存在');
      }

      // 验证旧密码
      const isValidOldPassword = await bcrypt.compare(oldPassword, users[0].password_hash);
      if (!isValidOldPassword) {
        throw new Error('原密码错误');
      }

      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

      // 更新密码
      await this.db.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [newPasswordHash, userId]
      );

      return {
        success: true,
        message: '密码修改成功'
      };

    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 检查权限
   */
  checkPermission(userRole, requiredRole) {
    const roleHierarchy = {
      'admin': 3,
      'reviewer': 2,
      'merchant': 1
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}

module.exports = AuthService;
