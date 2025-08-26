const express = require('express');
const AuthService = require('../services/AuthService');
const ReviewService = require('../services/ReviewService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * 获取系统统计数据（管理员专用）
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    
    // 获取用户统计
    const [userStats] = await execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
        SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as reviewer_count,
        SUM(CASE WHEN role = 'merchant' THEN 1 ELSE 0 END) as merchant_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users
      FROM users
    `);

    // 获取申请统计
    const [applicationStats] = await execute(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN DATE(submitted_at) = DATE('now') THEN 1 ELSE 0 END) as today_applications
      FROM business_cooperation
    `);

    // 获取任务统计
    const [taskStats] = await execute(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN DATE(updated_at) = DATE('now') AND status = 'completed' THEN 1 ELSE 0 END) as today_completed
      FROM workflow_tasks
    `);

    // 获取审核员工作负载
    const reviewerWorkload = await execute(`
      SELECT 
        r.reviewer_id,
        r.name,
        r.max_concurrent_tasks,
        COUNT(wt.task_id) as current_tasks,
        r.max_concurrent_tasks - COUNT(wt.task_id) as available_capacity
      FROM reviewers r
      LEFT JOIN workflow_tasks wt ON r.reviewer_id = wt.assigned_to AND wt.status = 'in_progress'
      WHERE r.is_active = 1
      GROUP BY r.reviewer_id, r.name, r.max_concurrent_tasks
      ORDER BY available_capacity ASC
    `);

    console.log('✅ 管理员仪表板数据查询成功');

    res.json({
      success: true,
      data: {
        users: userStats,
        applications: applicationStats,
        tasks: taskStats,
        reviewer_workload: reviewerWorkload
      }
    });

  } catch (error) {
    console.error('获取管理员仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败'
    });
  }
});

/**
 * 获取所有申请列表（管理员专用）
 */
router.get('/applications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute });
    
    const applications = await reviewService.getApplications();
    
    console.log(`✅ 管理员查询申请列表成功: ${applications.length} 条记录`);
    
    res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    console.error('获取申请列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请列表失败'
    });
  }
});

/**
 * 批量分配任务
 */
router.post('/batch-assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { taskIds, reviewerId } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '任务ID列表不能为空'
      });
    }

    if (!reviewerId) {
      return res.status(400).json({
        success: false,
        message: '审核员ID不能为空'
      });
    }

    const { execute, beginTransaction } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute, beginTransaction });

    const results = [];
    for (const taskId of taskIds) {
      try {
        const result = await reviewService.assignTask(taskId, reviewerId);
        results.push({ taskId, success: true, result });
      } catch (error) {
        results.push({ taskId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ 批量分配任务完成: ${successCount}/${taskIds.length} 成功`);

    res.json({
      success: true,
      message: `批量分配完成: ${successCount}/${taskIds.length} 成功`,
      data: results
    });

  } catch (error) {
    console.error('批量分配任务失败:', error);
    res.status(500).json({
      success: false,
      message: '批量分配任务失败'
    });
  }
});

/**
 * 系统配置管理
 */
router.get('/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    
    const configs = await execute(`
      SELECT config_key, config_value, config_type, description, is_active
      FROM system_config
      WHERE is_active = 1
      ORDER BY config_key
    `);

    res.json({
      success: true,
      data: configs
    });

  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
});

/**
 * 更新系统配置
 */
router.put('/config/:configKey', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;

    if (!configValue) {
      return res.status(400).json({
        success: false,
        message: '配置值不能为空'
      });
    }

    const { execute } = require('../config/database-sqlite');
    
    await execute(`
      UPDATE system_config 
      SET config_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE config_key = ? AND is_active = 1
    `, [configValue, configKey]);

    console.log(`✅ 管理员更新系统配置: ${configKey} = ${configValue}`);

    res.json({
      success: true,
      message: '配置更新成功'
    });

  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统配置失败'
    });
  }
});

/**
 * 获取操作日志
 */
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, actorType } = req.query;
    const { execute } = require('../config/database-sqlite');
    
    let whereConditions = [];
    let queryParams = [];
    
    if (action) {
      whereConditions.push('action = ?');
      queryParams.push(action);
    }
    
    if (actorType) {
      whereConditions.push('actor_type = ?');
      queryParams.push(actorType);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    const offset = (page - 1) * pageSize;
    
    const logs = await execute(`
      SELECT 
        wh.*,
        bc.company_name
      FROM workflow_history wh
      LEFT JOIN business_cooperation bc ON wh.user_id = bc.user_id
      ${whereClause}
      ORDER BY wh.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(pageSize), offset]);

    const [countResult] = await execute(`
      SELECT COUNT(*) as total
      FROM workflow_history wh
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: countResult.total
      }
    });

  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作日志失败'
    });
  }
});

module.exports = router;
