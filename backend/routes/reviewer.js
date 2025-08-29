const express = require('express');
const ReviewService = require('../services/ReviewService');
const { authenticateToken, requireReviewer } = require('../middleware/auth');
const router = express.Router();

/**
 * 获取审核员个人工作台数据
 */
router.get('/dashboard', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    
    // 获取分配给当前审核员的任务统计
    const [taskStats] = await execute(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN DATE(updated_at) = DATE('now') AND status = 'completed' THEN 1 ELSE 0 END) as today_completed,
        SUM(CASE WHEN status = 'in_progress' AND (julianday('now') - julianday(created_at)) * 24 > 48 THEN 1 ELSE 0 END) as overdue_tasks
      FROM workflow_tasks
      WHERE assigned_to = ?
    `, [req.user.userId]);

    // 获取最近的任务
    const recentTasks = await execute(`
      SELECT 
        wt.task_id,
        wt.status,
        wt.priority,
        wt.title,
        wt.created_at,
        wt.updated_at,
        bc.company_name,
        bc.merchant_type,
        bc.contact_info
      FROM workflow_tasks wt
      LEFT JOIN business_cooperation bc ON wt.user_id = bc.user_id
      WHERE wt.assigned_to = ?
      ORDER BY wt.updated_at DESC
      LIMIT 10
    `, [req.user.userId]);

    // 获取审核员信息
    const [reviewerInfo] = await execute(`
      SELECT * FROM reviewers WHERE reviewer_id = ?
    `, [req.user.userId]);

    // 获取本周完成的任务数量
    const [weeklyStats] = await execute(`
      SELECT 
        COUNT(*) as weekly_completed,
        AVG(julianday(completed_at) - julianday(started_at)) * 24 as avg_processing_hours
      FROM workflow_tasks
      WHERE assigned_to = ? 
      AND status = 'completed'
      AND DATE(completed_at) >= DATE('now', '-7 days')
    `, [req.user.userId]);

    console.log(`✅ 审核员工作台数据查询成功: ${req.user.username}`);

    res.json({
      success: true,
      data: {
        task_stats: taskStats,
        recent_tasks: recentTasks,
        reviewer_info: reviewerInfo,
        weekly_stats: weeklyStats
      }
    });

  } catch (error) {
    console.error('获取审核员工作台数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作台数据失败'
    });
  }
});

/**
 * 获取我的任务列表
 */
router.get('/my-tasks', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute });
    
    // 只获取分配给当前审核员的任务
    const filters = { 
      ...req.query, 
      assignee: req.user.userId 
    };
    
    const result = await reviewService.getTasks(filters);
    
    console.log(`✅ 审核员查询任务成功: ${req.user.username} - ${result.data.length} 条任务`);
    
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('获取审核员任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    });
  }
});

/**
 * 接受任务（将pending状态改为in_progress）
 */
router.post('/accept-task/:taskId', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { execute, beginTransaction } = require('../config/database-sqlite');
    
    const transaction = await beginTransaction();
    
    try {
      // 检查任务是否存在且分配给当前审核员
      const [task] = await transaction.execute(
        'SELECT * FROM workflow_tasks WHERE task_id = ? AND assigned_to = ?',
        [taskId, req.user.userId]
      );

      if (!task) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: '任务不存在或无权操作'
        });
      }

      if (task.status !== 'pending') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '任务状态不允许接受'
        });
      }

      // 更新任务状态
      await transaction.execute(`
        UPDATE workflow_tasks 
        SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
      `, [taskId]);

      // 记录历史
      await transaction.execute(`
        INSERT INTO workflow_history 
        (user_id, application_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        task.user_id, task.application_id, taskId, 'accepted', 'reviewer', req.user.userId,
        req.user.name, 'pending', 'in_progress', '审核员接受任务'
      ]);

      await transaction.commit();

      console.log(`✅ 审核员接受任务成功: ${req.user.username} -> ${taskId}`);

      res.json({
        success: true,
        message: '任务接受成功'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('接受任务失败:', error);
    res.status(500).json({
      success: false,
      message: '接受任务失败'
    });
  }
});

/**
 * 提交审核结果（增强版）
 */
router.post('/submit-review/:taskId', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { decision, comment, suggestions } = req.body;

    if (!decision || !comment) {
      return res.status(400).json({
        success: false,
        message: '审核决定和评论不能为空'
      });
    }

    const validDecisions = ['approved', 'rejected', 'changes_requested'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核决定'
      });
    }

    const { execute, beginTransaction } = require('../config/database-sqlite');
    const reviewService = new ReviewService({ execute, beginTransaction });

    // 检查任务是否分配给当前审核员
    const [task] = await execute(
      'SELECT * FROM workflow_tasks WHERE task_id = ? AND assigned_to = ?',
      [taskId, req.user.userId]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在或无权操作'
      });
    }

    // 构建完整的评论
    let fullComment = comment;
    if (suggestions) {
      fullComment += `\n\n改进建议：${suggestions}`;
    }

    const result = await reviewService.submitReview(
      taskId, 
      task.user_id, 
      decision, 
      fullComment, 
      req.user.userId
    );

    console.log(`✅ 审核员提交审核成功: ${req.user.username} -> ${taskId} (${decision})`);

    res.json({
      success: true,
      message: '审核结果提交成功',
      data: result
    });

  } catch (error) {
    console.error('提交审核结果失败:', error);
    res.status(500).json({
      success: false,
      message: '提交审核结果失败'
    });
  }
});

/**
 * 获取申请详情 - 审核员专用
 */
router.get('/application/:applicationId', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { execute } = require('../config/database-sqlite');

    console.log('🔍 审核员查询申请详情:', {
      applicationId,
      reviewerId: req.user.userId,
      reviewerName: req.user.username
    });

    // 获取申请基础信息
    const [application] = await execute(
      'SELECT * FROM business_cooperation WHERE id = ?',
      [applicationId]
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 检查审核员权限：管理员可以查看所有，审核员只能查看分配给自己的
    if (req.user.role === 'reviewer') {
      const [task] = await execute(
        'SELECT * FROM workflow_tasks WHERE user_id = ? AND assigned_to = ?',
        [application.user_id, req.user.userId]
      );

      if (!task) {
        console.log('❌ 审核员权限检查失败:', {
          applicationUserId: application.user_id,
          reviewerId: req.user.userId
        });
        return res.status(403).json({
          success: false,
          message: '此申请未分配给您，无权查看'
        });
      }
    }
    // 管理员无需权限检查，可以查看所有申请

    // 获取动态字段
    const dynamicFields = await execute(
      'SELECT * FROM merchant_details WHERE application_id = ? ORDER BY created_at',
      [application.application_id]
    );

    // 获取文档 - 使用DocumentService统一查询
    const DocumentService = require('../services/DocumentService');
    const documentService = new DocumentService();
    const documentsResult = await documentService.getApplicationDocuments(application.application_id);
    const documents = documentsResult.data;

    // 获取审核历史
    const history = await execute(
      'SELECT * FROM workflow_history WHERE user_id = ? ORDER BY created_at DESC',
      [application.user_id]
    );

    // 获取任务信息
    const [task] = await execute(
      'SELECT * FROM workflow_tasks WHERE user_id = ?',
      [application.user_id]
    );

    console.log(`✅ 审核员查询申请详情成功: applicationId=${applicationId}, userId=${application.user_id}`);

    res.json({
      success: true,
      data: {
        ...application,
        dynamic_fields: dynamicFields,
        documents: documents,
        history: history,
        task: task
      }
    });

  } catch (error) {
    console.error('审核员获取申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请详情失败'
    });
  }
});

/**
 * 获取任务对应的申请详情 - 通过taskId
 */
router.get('/task/:taskId/application', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { execute } = require('../config/database-sqlite');

    console.log('🔍 审核员通过任务ID查询申请详情:', {
      taskId,
      reviewerId: req.user.userId
    });

    // 获取任务信息并检查权限
    const [task] = await execute(
      'SELECT * FROM workflow_tasks WHERE task_id = ?',
      [taskId]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    // 检查任务权限：管理员可以查看所有，审核员只能查看分配给自己的
    if (req.user.role === 'reviewer' && task.assigned_to !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: '此任务未分配给您，无权查看'
      });
    }
    // 管理员无需权限检查，可以查看所有任务

    // 获取申请信息
    const [application] = await execute(
      'SELECT * FROM business_cooperation WHERE user_id = ?',
      [task.user_id]
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请信息不存在'
      });
    }

    // 获取完整申请详情
    const dynamicFields = await execute(
      'SELECT * FROM merchant_details WHERE application_id = ? ORDER BY created_at',
      [application.application_id]
    );

    // 获取文档 - 使用DocumentService统一查询
    const DocumentService = require('../services/DocumentService');
    const documentService = new DocumentService();
    const documentsResult = await documentService.getApplicationDocuments(application.application_id);
    const documents = documentsResult.data;

    const history = await execute(
      'SELECT * FROM workflow_history WHERE user_id = ? ORDER BY created_at DESC',
      [application.user_id]
    );

    console.log(`✅ 审核员通过任务查询申请详情成功: taskId=${taskId}, applicationId=${application.id}`);

    res.json({
      success: true,
      data: {
        ...application,
        dynamic_fields: dynamicFields,
        documents: documents,
        history: history,
        task: task
      }
    });

  } catch (error) {
    console.error('审核员通过任务获取申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请详情失败'
    });
  }
});

/**
 * 获取审核历史
 */
router.get('/review-history', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const { execute } = require('../config/database-sqlite');
    
    const offset = (page - 1) * pageSize;
    
    const history = await execute(`
      SELECT 
        wh.*,
        bc.company_name,
        bc.merchant_type
      FROM workflow_history wh
      LEFT JOIN business_cooperation bc ON wh.user_id = bc.user_id
      WHERE wh.actor_id = ? AND wh.action = 'reviewed'
      ORDER BY wh.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.userId, parseInt(pageSize), offset]);

    const [countResult] = await execute(`
      SELECT COUNT(*) as total
      FROM workflow_history
      WHERE actor_id = ? AND action = 'reviewed'
    `, [req.user.userId]);

    res.json({
      success: true,
      data: history,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: countResult.total
      }
    });

  } catch (error) {
    console.error('获取审核历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取审核历史失败'
    });
  }
});

/**
 * 更新审核员个人信息
 */
router.put('/profile', authenticateToken, requireReviewer, async (req, res) => {
  try {
    const { name, email, phone, specialties } = req.body;
    const { execute } = require('../config/database-sqlite');
    
    // 更新审核员信息
    await execute(`
      UPDATE reviewers 
      SET name = ?, email = ?, phone = ?, specialties = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reviewer_id = ?
    `, [name, email, phone, JSON.stringify(specialties), req.user.userId]);

    console.log(`✅ 审核员更新个人信息成功: ${req.user.username}`);

    res.json({
      success: true,
      message: '个人信息更新成功'
    });

  } catch (error) {
    console.error('更新审核员个人信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新个人信息失败'
    });
  }
});

module.exports = router;
