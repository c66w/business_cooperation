/**
 * 审核管理相关路由
 */

const express = require('express');
const ReviewService = require('../services/ReviewService');
const { authenticateToken, requireAdmin, requireReviewer } = require('../middleware/auth');
const router = express.Router();

// 所有数据现在都从SQLite数据库获取

/**
 * 获取任务列表
 */
router.get('/tasks', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute });

    // 根据用户角色过滤任务
    const filters = { ...req.query };
    if (req.user.role === 'reviewer') {
      // 审核员只能看到分配给自己的任务
      filters.assignee = req.user.userId;
    }

    const result = await reviewService.getTasks(filters);

    console.log(`✅ SQLite查询任务成功: ${result.data.length} 条任务记录`);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Failed to get tasks:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    });
  }
});

/**
 * 获取审核统计数据
 */
router.get('/statistics', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute });

    const stats = await reviewService.getStatistics();

    console.log('✅ SQLite查询统计数据成功:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 详情接口已移至 server.js 中，使用SQLite数据库

/**
 * 提交审核结果
 */
router.post('/submit', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { taskId, userId, decision, comment, reviewerId } = req.body;

    // 验证必填字段
    if (!taskId || !decision || !comment) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    const { execute, beginTransaction } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute, beginTransaction });

    const result = await reviewService.submitReview(taskId, userId, decision, comment, reviewerId);

    console.log(`✅ 审核结果提交成功: ${taskId} -> ${decision}`);

    res.json({
      success: true,
      message: '审核结果提交成功',
      data: result
    });

  } catch (error) {
    console.error('❌ 提交审核结果失败:', error);
    res.status(500).json({
      success: false,
      message: '提交审核结果失败'
    });
  }
});

/**
 * 分配任务
 */
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { taskId, reviewerId } = req.body;

    if (!taskId || !reviewerId) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    const { execute, beginTransaction } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute, beginTransaction });

    const result = await reviewService.assignTask(taskId, reviewerId);

    console.log(`✅ 任务分配成功: ${taskId} -> ${reviewerId}`);

    res.json({
      success: true,
      message: '任务分配成功',
      data: result
    });

  } catch (error) {
    console.error('❌ 任务分配失败:', error);
    res.status(500).json({
      success: false,
      message: '任务分配失败'
    });
  }
});

/**
 * 获取审核员列表
 */
router.get('/reviewers', async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');

    // 从数据库获取审核员数据
    const reviewers = await execute(`
      SELECT
        reviewer_id as id,
        name,
        email,
        department,
        specialties,
        max_concurrent_tasks as max_tasks,
        is_active
      FROM reviewers
      WHERE is_active = 1
      ORDER BY name
    `);

    // 获取每个审核员的当前任务数
    const reviewersWithTasks = await Promise.all(
      reviewers.map(async (reviewer) => {
        const [taskCount] = await execute(`
          SELECT COUNT(*) as count
          FROM workflow_tasks
          WHERE assigned_to = ? AND status IN ('pending', 'in_progress')
        `, [reviewer.id]);

        return {
          ...reviewer,
          active_tasks: taskCount.count,
          specialties: reviewer.specialties ? JSON.parse(reviewer.specialties) : []
        };
      })
    );

    console.log(`✅ 查询审核员成功: ${reviewersWithTasks.length} 个审核员`);

    res.json({
      success: true,
      data: reviewersWithTasks
    });

  } catch (error) {
    console.error('Failed to get reviewers:', error);
    res.status(500).json({
      success: false,
      message: '获取审核员列表失败'
    });
  }
});

/**
 * 获取审核历史
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 模拟审核历史
    const history = [
      {
        action: 'submitted',
        actor_name: '商家',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        comment: '商家提交申请'
      },
      {
        action: 'assigned',
        actor_name: '系统',
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
        comment: '自动分配给张审核'
      },
      {
        action: 'reviewed',
        actor_name: '张审核',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        comment: '审核通过，资质齐全'
      }
    ];
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Failed to get review history:', error);
    res.status(500).json({
      success: false,
      message: '获取审核历史失败'
    });
  }
});

/**
 * 分配任务给审核员
 */
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { taskId, reviewerId } = req.body;

    if (!taskId || !reviewerId) {
      return res.status(400).json({
        success: false,
        message: '任务ID和审核员ID不能为空'
      });
    }

    const { execute } = require('../config/database-sqlite');

    // 检查任务是否存在
    const [task] = await execute(`
      SELECT task_id, user_id, assigned_to, status
      FROM workflow_tasks
      WHERE task_id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const oldAssignee = task.assigned_to || 'unassigned';

    // 更新任务分配
    await execute(`
      UPDATE workflow_tasks
      SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = ?
    `, [reviewerId, taskId]);

    // 记录操作历史
    await execute(`
      INSERT INTO workflow_history (
        user_id, task_id, action, actor_type, actor_id, actor_name,
        from_status, to_status, comment, created_at
      ) VALUES (?, ?, 'assigned', 'admin', ?, ?, ?, ?, '管理员分配任务', CURRENT_TIMESTAMP)
    `, [task.user_id, taskId, req.user.userId, req.user.name, oldAssignee, reviewerId]);

    console.log(`✅ 任务分配成功: ${taskId} (${oldAssignee} -> ${reviewerId})`);

    res.json({
      success: true,
      message: '任务分配成功',
      data: {
        taskId,
        oldAssignee,
        newAssignee: reviewerId
      }
    });

  } catch (error) {
    console.error('Failed to assign task:', error);
    res.status(500).json({
      success: false,
      message: '任务分配失败'
    });
  }
});

/**
 * 批量分配任务
 */
router.post('/assign-batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assignments } = req.body; // [{ taskId, reviewerId }, ...]

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: '分配列表不能为空'
      });
    }

    const { execute } = require('../config/database-sqlite');
    const results = [];

    for (const { taskId, reviewerId } of assignments) {
      try {
        // 检查任务是否存在
        const [task] = await execute(`
          SELECT task_id, user_id, assigned_to, status
          FROM workflow_tasks
          WHERE task_id = ?
        `, [taskId]);

        if (!task) {
          results.push({ taskId, success: false, message: '任务不存在' });
          continue;
        }

        const oldAssignee = task.assigned_to || 'unassigned';

        // 更新任务分配
        await execute(`
          UPDATE workflow_tasks
          SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
          WHERE task_id = ?
        `, [reviewerId, taskId]);

        // 记录操作历史
        await execute(`
          INSERT INTO workflow_history (
            user_id, task_id, action, actor_type, actor_id, actor_name,
            from_status, to_status, comment, created_at
          ) VALUES (?, ?, 'assigned', 'admin', ?, ?, ?, ?, '管理员批量分配任务', CURRENT_TIMESTAMP)
        `, [task.user_id, taskId, req.user.userId, req.user.name, oldAssignee, reviewerId]);

        results.push({
          taskId,
          success: true,
          oldAssignee,
          newAssignee: reviewerId
        });

      } catch (error) {
        console.error(`Failed to assign task ${taskId}:`, error);
        results.push({ taskId, success: false, message: '分配失败' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 批量任务分配完成: ${successCount}/${assignments.length} 成功`);

    res.json({
      success: true,
      message: `批量分配完成，成功 ${successCount}/${assignments.length} 个任务`,
      data: results
    });

  } catch (error) {
    console.error('Failed to batch assign tasks:', error);
    res.status(500).json({
      success: false,
      message: '批量分配失败'
    });
  }
});

module.exports = router;
