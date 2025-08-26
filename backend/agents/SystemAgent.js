/**
 * 系统Agent
 * 负责数据库操作、状态管理、任务创建和系统级操作
 */

const BaseAgent = require('./BaseAgent');
const { v4: uuidv4 } = require('uuid');

class SystemAgent extends BaseAgent {
  constructor(dbConnection, config = {}) {
    super('SystemAgent', config);
    this.db = dbConnection;
    this.isRealDatabase = dbConnection && typeof dbConnection.execute === 'function';
    
    // 状态转换规则
    this.statusTransitions = {
      'draft': ['submitted'],
      'submitted': ['under_review', 'rejected'],
      'under_review': ['approved', 'rejected'],
      'approved': [],
      'rejected': []
    };
  }

  /**
   * 处理系统任务
   * @param {Object} task - 系统任务
   * @returns {Promise<Object>} 处理结果
   */
  async process(task) {
    // 处理工作流步骤
    if (task.stepId) {
      return await this.processWorkflowStep(task);
    }

    // 处理直接动作
    const { action, data } = task;

    switch (action) {
      case 'save_merchant_data':
        return await this.saveMerchantData(data);
      case 'create_workflow_task':
        return await this.createWorkflowTask(data);
      case 'update_status':
        return await this.updateMerchantStatus(data);
      case 'assign_reviewer':
        return await this.assignReviewer(data);
      case 'log_history':
        return await this.logWorkflowHistory(data);
      default:
        throw new Error(`Unknown system action: ${action}`);
    }
  }

  /**
   * 处理工作流步骤
   * @param {Object} task - 工作流任务
   * @returns {Promise<Object>} 处理结果
   */
  async processWorkflowStep(task) {
    const { stepId, processedData } = task;

    switch (stepId) {
      case 'data_save':
        return await this.saveMerchantData({ processedData });
      case 'approval':
        return await this.handleApproval(task);
      case 'rejection':
        return await this.handleRejection(task);
      default:
        throw new Error(`Unknown workflow step: ${stepId}`);
    }
  }

  /**
   * 保存商家数据
   * @param {Object} data - 商家数据
   * @returns {Promise<Object>} 保存结果
   */
  async saveMerchantData(data) {
    const { processedData } = data;
    const { commonFields, specificFields, merchantType, files, userId } = processedData;

    if (!this.isRealDatabase) {
      throw new Error('数据库连接不可用，无法保存商家数据');
    }

    let transaction = null;
    try {
      // 开始事务
      transaction = await this.db.beginTransaction();

      // 1. 保存基础信息到 business_cooperation 表
      const cooperationData = {
        user_id: userId,
        company_name: commonFields.company_name,
        attendee_name: commonFields.contact_name,
        contact_info: commonFields.contact_phone,
        attendee_job: commonFields.contact_position || '',
        industry_operator: commonFields.industry_operator_contact || '',
        merchant_type: merchantType,
        status: 'submitted',
        submitted_at: new Date()
      };

      await this.insertBusinessCooperation(cooperationData, transaction);

      // 2. 保存动态字段到 merchant_details 表
      for (const [fieldName, fieldValue] of Object.entries(specificFields)) {
        await this.insertMerchantDetail({
          user_id: userId,
          merchant_type: merchantType,
          field_name: fieldName,
          field_value: fieldValue
        }, transaction);
      }

      // 3. 保存文件信息到 business_qualification_document 表
      for (const file of files) {
        await this.insertQualificationDocument({
          user_id: userId,
          file_name: file.originalname,
          file_url: file.path,
          file_id: file.filename,
          file_type: file.mimetype,
          upload_time: new Date()
        }, transaction);
      }

      // 4. 记录历史
      await this.logWorkflowHistory({
        user_id: userId,
        action: 'submitted',
        actor_type: 'merchant',
        actor_id: userId,
        to_status: 'submitted',
        comment: '商家提交申请'
      }, transaction);

      // 提交事务
      await transaction.commit();

      return {
        success: true,
        userId,
        message: '商家数据保存成功',
        nextStep: 'create_workflow_task'
      };

    } catch (error) {
      // 回滚事务
      if (transaction) {
        await transaction.rollback();
      }
      throw new Error(`保存商家数据失败: ${error.message}`);
    }
  }

  /**
   * 创建工作流任务
   * @param {Object} data - 任务数据
   * @returns {Promise<Object>} 创建结果
   */
  async createWorkflowTask(data) {
    const { userId, taskType = 'review', validationResult } = data;

    try {
      const taskId = uuidv4();
      const taskData = {
        task_id: taskId,
        user_id: userId,
        task_type: taskType,
        status: 'pending',
        title: this.generateTaskTitle(taskType, userId),
        description: this.generateTaskDescription(taskType, validationResult),
        priority: this.calculateTaskPriority(validationResult),
        metadata: JSON.stringify({
          validationScore: validationResult?.validationScore,
          autoValidationPassed: validationResult?.validationPassed,
          createdBy: 'system'
        })
      };

      await this.insertWorkflowTask(taskData);

      // 记录历史
      await this.logWorkflowHistory({
        user_id: userId,
        task_id: taskId,
        action: 'created',
        actor_type: 'system',
        actor_id: 'system',
        comment: `创建${taskType}任务`
      });

      return {
        success: true,
        taskId,
        message: '工作流任务创建成功',
        nextStep: 'assign_reviewer'
      };

    } catch (error) {
      throw new Error(`创建工作流任务失败: ${error.message}`);
    }
  }

  /**
   * 分配审核员
   * @param {Object} data - 分配数据
   * @returns {Promise<Object>} 分配结果
   */
  async assignReviewer(data) {
    const { taskId, userId, preferredReviewer } = data;

    try {
      let assignedReviewer;

      if (preferredReviewer) {
        // 使用指定的审核员
        assignedReviewer = preferredReviewer;
      } else {
        // 自动分配审核员
        assignedReviewer = await this.findAvailableReviewer(userId);
      }

      if (!assignedReviewer) {
        throw new Error('没有可用的审核员');
      }

      // 更新任务分配
      await this.updateWorkflowTask(taskId, {
        assigned_to: assignedReviewer,
        status: 'in_progress'
      });

      // 记录历史
      await this.logWorkflowHistory({
        user_id: userId,
        task_id: taskId,
        action: 'assigned',
        actor_type: 'system',
        actor_id: 'system',
        comment: `任务分配给 ${assignedReviewer}`
      });

      return {
        success: true,
        assignedReviewer,
        message: '审核员分配成功',
        nextStep: 'notify_reviewer'
      };

    } catch (error) {
      throw new Error(`分配审核员失败: ${error.message}`);
    }
  }

  /**
   * 更新商家状态
   * @param {Object} data - 状态更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateMerchantStatus(data) {
    const { userId, newStatus, comment, actorType, actorId } = data;

    try {
      // 获取当前状态
      const currentStatus = await this.getMerchantStatus(userId);
      
      // 验证状态转换
      if (!this.isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(`无效的状态转换: ${currentStatus} -> ${newStatus}`);
      }

      // 更新状态
      await this.updateBusinessCooperationStatus(userId, newStatus);

      // 记录历史
      await this.logWorkflowHistory({
        user_id: userId,
        action: 'modified',
        actor_type: actorType,
        actor_id: actorId,
        from_status: currentStatus,
        to_status: newStatus,
        comment: comment
      });

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: newStatus,
        message: '状态更新成功'
      };

    } catch (error) {
      throw new Error(`更新状态失败: ${error.message}`);
    }
  }

  /**
   * 记录工作流历史
   * @param {Object} data - 历史数据
   * @returns {Promise<Object>} 记录结果
   */
  async logWorkflowHistory(data) {
    try {
      const historyData = {
        user_id: data.user_id,
        task_id: data.task_id || null,
        action: data.action,
        actor_type: data.actor_type,
        actor_id: data.actor_id,
        actor_name: data.actor_name || null,
        from_status: data.from_status || null,
        to_status: data.to_status || null,
        comment: data.comment || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      };

      await this.insertWorkflowHistory(historyData);

      return {
        success: true,
        message: '历史记录成功'
      };

    } catch (error) {
      throw new Error(`记录历史失败: ${error.message}`);
    }
  }

  /**
   * 处理审核通过
   * @param {Object} task - 任务数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleApproval(task) {
    const { userId } = task;

    // 更新商家状态为已通过
    await this.updateMerchantStatus({
      userId,
      status: 'approved',
      comment: '审核通过'
    });

    return {
      success: true,
      message: '商家审核通过',
      nextStep: null
    };
  }

  /**
   * 处理审核拒绝
   * @param {Object} task - 任务数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleRejection(task) {
    const { userId, reason } = task;

    // 更新商家状态为已拒绝
    await this.updateMerchantStatus({
      userId,
      status: 'rejected',
      comment: reason || '审核不通过'
    });

    return {
      success: true,
      message: '商家审核拒绝',
      nextStep: null
    };
  }



  // ==================== 数据库操作方法 ====================

  async insertBusinessCooperation(data, transaction = null) {
    const sql = `
      INSERT INTO business_cooperation
      (user_id, company_name, attendee_name, contact_info, attendee_job, industry_operator, merchant_type, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const executor = transaction || this.db;
    return await executor.execute(sql, [
      data.user_id, data.company_name, data.attendee_name, data.contact_info,
      data.attendee_job, data.industry_operator, data.merchant_type, data.status, data.submitted_at
    ]);
  }

  async insertMerchantDetail(data, transaction = null) {
    const sql = `
      INSERT INTO merchant_details (user_id, merchant_type, field_name, field_value)
      VALUES (?, ?, ?, ?)
    `;
    const executor = transaction || this.db;
    return await executor.execute(sql, [data.user_id, data.merchant_type, data.field_name, data.field_value]);
  }

  async insertQualificationDocument(data, transaction = null) {
    const sql = `
      INSERT INTO business_qualification_document
      (user_id, file_name, file_url, file_id, file_type, upload_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const executor = transaction || this.db;
    return await executor.execute(sql, [
      data.user_id, data.file_name, data.file_url, data.file_id, data.file_type, data.upload_time
    ]);
  }

  async insertWorkflowTask(data, transaction = null) {
    const sql = `
      INSERT INTO workflow_tasks
      (task_id, user_id, task_type, status, title, description, priority, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const executor = transaction || this.db;
    return await executor.execute(sql, [
      data.task_id, data.user_id, data.task_type, data.status,
      data.title, data.description, data.priority, data.metadata
    ]);
  }

  async insertWorkflowHistory(data, transaction = null) {
    const sql = `
      INSERT INTO workflow_history
      (user_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const executor = transaction || this.db;
    return await executor.execute(sql, [
      data.user_id, data.task_id, data.action, data.actor_type, data.actor_id,
      data.actor_name, data.from_status, data.to_status, data.comment, data.metadata
    ]);
  }

  // ==================== 辅助方法 ====================

  generateTaskTitle(taskType, userId) {
    const titles = {
      'review': `商家审核任务 - ${userId}`,
      'validation': `数据验证任务 - ${userId}`,
      'approval': `最终审批任务 - ${userId}`
    };
    return titles[taskType] || `未知任务 - ${userId}`;
  }

  generateTaskDescription(taskType, validationResult) {
    if (taskType === 'review' && validationResult) {
      return `验证分数: ${validationResult.validationScore}/100, 自动验证: ${validationResult.validationPassed ? '通过' : '未通过'}`;
    }
    return `${taskType}任务`;
  }

  calculateTaskPriority(validationResult) {
    if (!validationResult) return 'medium';
    
    const score = validationResult.validationScore;
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    return 'high';
  }

  async findAvailableReviewer(userId) {
    try {
      // 查找可用的审核员
      const reviewers = await this.db.execute(`
        SELECT reviewer_id, name, max_concurrent_tasks,
               (SELECT COUNT(*) FROM workflow_tasks
                WHERE assigned_to = r.reviewer_id AND status = 'in_progress') as current_tasks
        FROM reviewers r
        WHERE is_active = TRUE
        AND (SELECT COUNT(*) FROM workflow_tasks
             WHERE assigned_to = r.reviewer_id AND status = 'in_progress') < max_concurrent_tasks
        ORDER BY current_tasks ASC, reviewer_id ASC
        LIMIT 1
      `);

      if (reviewers.length > 0) {
        return reviewers[0].reviewer_id;
      }

      // 如果没有找到可用审核员，返回默认审核员
      console.warn('⚠️  没有找到可用审核员，使用默认审核员');
      return 'default_reviewer';

    } catch (error) {
      console.error('查找审核员失败:', error);
      return 'default_reviewer';
    }
  }

  async getMerchantStatus(userId) {
    const sql = 'SELECT status FROM business_cooperation WHERE user_id = ?';
    const result = await this.db.execute(sql, [userId]);
    return result[0]?.status || 'draft';
  }

  isValidStatusTransition(fromStatus, toStatus) {
    const allowedTransitions = this.statusTransitions[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }

  async updateBusinessCooperationStatus(userId, status) {
    const sql = 'UPDATE business_cooperation SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
    return await this.db.execute(sql, [status, userId]);
  }

  async updateWorkflowTask(taskId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE workflow_tasks SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE task_id = ?`;
    return await this.db.execute(sql, [...values, taskId]);
  }
}

module.exports = SystemAgent;
