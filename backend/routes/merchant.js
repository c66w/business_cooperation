/**
 * 商家申请相关路由
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApplicationService = require('../services/ApplicationService');
const { authenticateToken, requireMerchant } = require('../middleware/auth');
const router = express.Router();

// 移除了Agent和WorkflowEngine，使用简化的服务层

// 配置文件上传 - 使用内存存储
const upload = multer({
  storage: multer.memoryStorage(), // 使用内存存储，不保存到磁盘
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // 最多10个文件
  },
  fileFilter: function (req, file, cb) {
    // 修复文件名编码问题
    try {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (error) {
      console.warn('文件名编码转换失败:', error);
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

// Agent和WorkflowEngine已移除，使用简化的服务层

/**
 * 商家申请提交接口
 */
router.post('/apply', authenticateToken, requireMerchant, upload.array('files'), async (req, res) => {
  try {
    console.log('Received merchant application:', {
      body: req.body,
      files: req.files?.map(f => ({ name: f.originalname, size: f.size }))
    });

    // 获取数据库连接
    const { execute, beginTransaction } = require('../config/database-sqlite');
    const applicationService = new ApplicationService({ execute, beginTransaction });

    // 准备表单数据
    const formData = { ...req.body };

    // 处理数组字段（如cooperation_requirements）
    Object.keys(formData).forEach(key => {
      try {
        const parsed = JSON.parse(formData[key]);
        if (Array.isArray(parsed)) {
          formData[key] = parsed;
        }
      } catch (e) {
        // 不是JSON，保持原值
      }
    });

    // 提交申请 - 传递当前用户信息
    const result = await applicationService.submitApplication(formData, req.files || [], req.user);

    res.json({
      success: true,
      message: '申请提交成功',
      data: {
        userId: result.userId,
        applicationId: result.applicationId,  // 新增：返回申请的实际ID
        taskId: result.taskId,
        assignedReviewer: result.assignedReviewer,
        status: 'submitted'
      }
    });

  } catch (error) {
    console.error('Merchant application submission failed:', error);
    
    // 清理上传的文件
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Failed to cleanup file:', file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '申请提交失败，请重试'
    });
  }
});

// 字段配置接口已移至 server.js 中

// 商家类型接口已移至 server.js 中

/**
 * 查询申请状态
 */
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 直接查询数据库，不依赖Agent

    // 从数据库查询申请状态
    try {
      const { execute } = require('../config/database-sqlite');

      const applications = await execute(`
        SELECT bc.*, wt.status as task_status, wt.created_at as task_created_at
        FROM business_cooperation bc
        LEFT JOIN workflow_tasks wt ON bc.user_id = wt.user_id
        WHERE bc.user_id = ?
        ORDER BY bc.submitted_at DESC
        LIMIT 1
      `, [userId]);

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到申请记录'
        });
      }

      const application = applications[0];

      const statusTextMap = {
        'submitted': '已提交',
        'under_review': '审核中',
        'approved': '已通过',
        'rejected': '已拒绝'
      };

      res.json({
        success: true,
        data: {
          userId,
          status: application.status,
          statusText: statusTextMap[application.status] || '未知状态',
          submittedAt: application.submitted_at,
          taskStatus: application.task_status,
          estimatedCompletionTime: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72小时后
        }
      });

    } catch (error) {
      console.error('查询申请状态失败:', error);
      res.status(500).json({
        success: false,
        message: '查询申请状态失败'
      });
    }

  } catch (error) {
    console.error('Failed to get application status:', error);
    res.status(500).json({
      success: false,
      message: '查询状态失败'
    });
  }
});

/**
 * 获取商家自己的申请列表
 */
router.get('/my-applications', authenticateToken, requireMerchant, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');

    // 调试：打印用户信息
    console.log('🔍 商家查询申请 - 用户信息:', {
      user_id: req.user.user_id,
      id: req.user.id,
      username: req.user.username,
      name: req.user.name
    });

    const userId = req.user.userId;  // JWT中存储的是userId字段
    console.log('🔍 使用的查询user_id:', userId);
    console.log('🔍 完整的req.user对象:', JSON.stringify(req.user, null, 2));

    // 查询该商家的所有申请 - 只通过user_id匹配
    const applications = await execute(`
      SELECT
        bc.*,
        wt.task_id,
        wt.status as task_status,
        wt.assigned_to,
        wt.created_at as task_created_at,
        wt.updated_at as task_updated_at
      FROM business_cooperation bc
      LEFT JOIN (
        SELECT
          application_id,
          task_id,
          status,
          assigned_to,
          created_at,
          updated_at,
          ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY updated_at DESC) as rn
        FROM workflow_tasks
      ) wt ON bc.application_id = wt.application_id AND wt.rn = 1
      WHERE bc.user_id = ?
      ORDER BY bc.submitted_at DESC
    `, [userId]);

    console.log('🔍 查询结果数量:', applications.length);

    // 获取每个申请的动态字段
    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        const details = await execute(
          'SELECT * FROM merchant_details WHERE application_id = ? ORDER BY created_at',
          [app.application_id]
        );

        const documents = await execute(
          'SELECT * FROM business_qualification_document WHERE user_id = ? ORDER BY upload_time',
          [app.user_id]
        );

        return {
          ...app,
          dynamic_fields: details,
          documents: documents
        };
      })
    );

    console.log(`✅ 商家查询申请列表成功: ${req.user.username} - ${applicationsWithDetails.length} 条记录`);

    res.json({
      success: true,
      data: applicationsWithDetails
    });

  } catch (error) {
    console.error('获取商家申请列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请列表失败'
    });
  }
});

/**
 * 获取申请详情
 */
router.get('/application/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { execute } = require('../config/database-sqlite');

    // 调试信息
    console.log('🔍 申请详情查询 - 参数:', {
      requestedApplicationId: applicationId,
      currentUser: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role
      }
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

    // 权限检查：商家只能查看自己的申请
    if (req.user.role === 'merchant' && application.user_id !== req.user.userId) {
      console.log('❌ 权限检查失败:', {
        applicationUserId: application.user_id,
        currentUserId: req.user.userId
      });
      return res.status(403).json({
        success: false,
        message: '无权查看此申请'
      });
    }

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

    console.log(`✅ 查询申请详情成功: applicationId=${applicationId}, userId=${application.user_id}`);

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
    console.error('获取申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请详情失败'
    });
  }
});

/**
 * 获取商家申请列表 - 别名路由（兼容性）
 */
router.get('/applications', authenticateToken, requireMerchant, async (req, res) => {
  // 重定向到 my-applications 路由的逻辑
  try {
    const { execute } = require('../config/database-sqlite');

    // 调试：打印用户信息
    console.log('🔍 商家查询申请(别名路由) - 用户信息:', {
      user_id: req.user.user_id,
      id: req.user.id,
      username: req.user.username,
      name: req.user.name
    });

    const userId = req.user.userId;
    console.log('🔍 别名路由使用的查询user_id:', userId);

    // 查询该商家的所有申请 - 只通过user_id匹配
    const applications = await execute(`
      SELECT
        bc.*,
        wt.task_id,
        wt.status as task_status,
        wt.assigned_to,
        wt.created_at as task_created_at,
        wt.updated_at as task_updated_at
      FROM business_cooperation bc
      LEFT JOIN (
        SELECT
          application_id,
          task_id,
          status,
          assigned_to,
          created_at,
          updated_at,
          ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY updated_at DESC) as rn
        FROM workflow_tasks
      ) wt ON bc.application_id = wt.application_id AND wt.rn = 1
      WHERE bc.user_id = ?
      ORDER BY bc.submitted_at DESC
    `, [userId]);

    console.log('🔍 别名路由查询结果数量:', applications.length);

    // 获取每个申请的动态字段
    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        const details = await execute(
          'SELECT * FROM merchant_details WHERE application_id = ? ORDER BY created_at',
          [app.application_id]
        );

        const documents = await execute(
          'SELECT * FROM business_qualification_document WHERE user_id = ? ORDER BY upload_time',
          [app.user_id]
        );

        return {
          ...app,
          dynamic_fields: details,
          documents: documents
        };
      })
    );

    console.log(`✅ 商家查询申请列表成功 (别名路由): ${req.user.username} - ${applicationsWithDetails.length} 条记录`);

    res.json({
      success: true,
      data: applicationsWithDetails
    });

  } catch (error) {
    console.error('获取商家申请列表失败 (别名路由):', error);
    res.status(500).json({
      success: false,
      message: '获取申请列表失败'
    });
  }
});

// 调试当前用户信息
router.get('/debug-user', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        currentUser: req.user,
        headers: req.headers.authorization
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 临时调试路由 - 绕过认证直接测试
router.get('/debug-applications', async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');

    console.log('🔍 调试路由 - 直接查询merchant_001的申请');

    const applications = await execute(`
      SELECT
        bc.*,
        wt.task_id,
        wt.status as task_status
      FROM business_cooperation bc
      LEFT JOIN workflow_tasks wt ON bc.user_id = wt.user_id
      WHERE bc.user_id = ?
      ORDER BY bc.submitted_at DESC
    `, ['merchant_001']);

    console.log('🔍 调试查询结果:', applications.length, '条记录');

    res.json({
      success: true,
      data: applications,
      debug: {
        query_user_id: 'merchant_001',
        result_count: applications.length
      }
    });

  } catch (error) {
    console.error('调试查询失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 导出路由
module.exports = router;
