/**
 * 审核服务
 * 处理所有审核相关的业务逻辑
 */
class ReviewService {
  constructor(db) {
    this.db = db;
  }

  /**
   * 获取任务列表
   */
  async getTasks(filters = {}) {
    const { status, assignee, page = 1, pageSize = 10 } = filters;
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    if (status && status !== 'all') {
      whereConditions.push('wt.status = ?');
      queryParams.push(status);
    }
    
    if (assignee) {
      whereConditions.push('wt.assigned_to = ?');
      queryParams.push(assignee);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 查询工作流任务并关联商家信息
    const sql = `
      SELECT 
        wt.task_id,
        wt.user_id,
        wt.application_id,
        wt.task_type,
        wt.status,
        wt.assigned_to,
        wt.priority,
        wt.title,
        wt.description,
        wt.created_at,
        wt.updated_at,
        bc.company_name,
        bc.attendee_name as contact_name,
        bc.contact_info as contact_phone,
        bc.merchant_type,
        bc.status as merchant_status,
        bc.submitted_at
      FROM workflow_tasks wt
      LEFT JOIN business_cooperation bc ON wt.application_id = bc.application_id
      ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const offset = (page - 1) * pageSize;
    const tasks = await this.db.execute(sql, [...queryParams, parseInt(pageSize), offset]);
    
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM workflow_tasks wt
      LEFT JOIN business_cooperation bc ON wt.application_id = bc.application_id
      ${whereClause}
    `;
    const countResult = await this.db.execute(countSql, queryParams);
    const total = countResult[0]?.total || 0;
    
    // 格式化任务数据
    const formattedTasks = tasks.map(task => ({
      task_id: task.task_id,
      user_id: task.user_id,
      application_id: task.application_id,
      company_name: task.company_name || '未知公司',
      merchant_type: task.merchant_type || 'unknown',
      contact_name: task.contact_name || '未知联系人',
      contact_phone: task.contact_phone || '',
      submitted_at: task.submitted_at || task.created_at,
      status: task.status,
      assigned_to: task.assigned_to,
      priority: task.priority || 'medium',
      title: task.title,
      description: task.description,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
    
    return {
      data: formattedTasks,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total
      }
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const [pendingCount] = await this.db.execute('SELECT COUNT(*) as count FROM workflow_tasks WHERE status = ?', ['pending']);
    const [inProgressCount] = await this.db.execute('SELECT COUNT(*) as count FROM workflow_tasks WHERE status = ?', ['in_progress']);
    const [completedCount] = await this.db.execute('SELECT COUNT(*) as count FROM workflow_tasks WHERE status = ?', ['completed']);
    
    // 今天完成的任务
    const [completedTodayCount] = await this.db.execute(`
      SELECT COUNT(*) as count 
      FROM workflow_tasks 
      WHERE status = 'completed' 
      AND DATE(updated_at) = DATE('now')
    `);
    
    // 超期任务（超过72小时未处理）
    const [overdueCount] = await this.db.execute(`
      SELECT COUNT(*) as count 
      FROM workflow_tasks 
      WHERE status = 'pending' 
      AND (julianday('now') - julianday(created_at)) * 24 > 72
    `);
    
    return {
      pending: pendingCount.count,
      in_progress: inProgressCount.count,
      completed: completedCount.count,
      completed_today: completedTodayCount.count,
      overdue: overdueCount.count
    };
  }

  /**
   * 分配任务
   */
  async assignTask(taskId, reviewerId) {
    const transaction = await this.db.beginTransaction();
    
    try {
      // 查找任务
      const tasks = await transaction.execute('SELECT * FROM workflow_tasks WHERE task_id = ?', [taskId]);
      if (tasks.length === 0) {
        throw new Error('任务不存在');
      }
      
      const task = tasks[0];
      
      // 更新分配信息
      await transaction.execute(`
        UPDATE workflow_tasks 
        SET assigned_to = ?, status = 'in_progress', updated_at = CURRENT_TIMESTAMP,
            started_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
      `, [reviewerId, taskId]);
      
      // 记录历史
      await transaction.execute(`
        INSERT INTO workflow_history 
        (user_id, application_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        task.user_id, task.application_id, taskId, 'assigned', 'system', 'system', 
        'System', task.status, 'in_progress', `任务分配给 ${reviewerId}`
      ]);
      
      await transaction.commit();
      
      console.log(`✅ 任务分配成功: ${taskId} -> ${reviewerId}`);
      
      return {
        taskId,
        reviewerId,
        status: 'in_progress'
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 提交审核结果
   */
  async submitReview(taskId, userId, decision, comment, reviewerId) {
    const transaction = await this.db.beginTransaction();
    
    try {
      // 查找任务
      const tasks = await transaction.execute('SELECT * FROM workflow_tasks WHERE task_id = ?', [taskId]);
      if (tasks.length === 0) {
        throw new Error('任务不存在');
      }
      
      const task = tasks[0];
      
      // 更新任务状态
      const newStatus = 'completed';
      
      await transaction.execute(`
        UPDATE workflow_tasks 
        SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP,
            completed_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
      `, [newStatus, reviewerId, taskId]);
      
      // 记录审核历史
      await transaction.execute(`
        INSERT INTO workflow_history 
        (user_id, application_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        task.user_id, task.application_id, taskId, 'reviewed', 'reviewer', reviewerId, 
        reviewerId, task.status, newStatus, comment
      ]);
      
      // 更新商家状态
      const merchantStatusMap = {
        'approved': 'approved',
        'rejected': 'rejected'
      };
      
      const merchantStatus = merchantStatusMap[decision];
      if (merchantStatus) {
        await transaction.execute(`
          UPDATE business_cooperation 
          SET status = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `, [merchantStatus, task.user_id]);
      }
      
      await transaction.commit();
      
      console.log(`✅ 审核结果提交成功: ${taskId} -> ${decision}`);
      
      return {
        taskId,
        decision,
        status: newStatus
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取商家申请列表
   */
  async getApplications() {
    const sql = `
      SELECT
        bc.*,
        GROUP_CONCAT(md.field_name || ':' || md.field_value, ';') as dynamic_fields,
        COUNT(bqd.file_id) as document_count
      FROM business_cooperation bc
      LEFT JOIN merchant_details md ON bc.application_id = md.application_id
      LEFT JOIN business_qualification_document bqd ON bc.user_id = bqd.user_id
      GROUP BY bc.application_id
      ORDER BY bc.submitted_at DESC
    `;
    
    const applications = await this.db.execute(sql);
    
    return applications.map(app => ({
      ...app,
      dynamic_fields: app.dynamic_fields || '',
      document_count: app.document_count || 0
    }));
  }

  /**
   * 获取申请详情
   */
  async getApplicationDetail(userId) {
    // 获取基础信息
    const [application] = await this.db.execute(
      'SELECT * FROM business_cooperation WHERE user_id = ?', 
      [userId]
    );
    
    if (!application) {
      throw new Error('申请不存在');
    }
    
          // 获取动态字段
      const dynamicFields = await this.db.execute(
        'SELECT * FROM merchant_details WHERE application_id = ? ORDER BY created_at',
        [applicationId]
      );
    
    // 获取文档
    const documents = await this.db.execute(
      'SELECT * FROM business_qualification_document WHERE user_id = ? ORDER BY upload_time',
      [userId]
    );
    
    return {
      ...application,
      dynamic_fields: dynamicFields,
      documents: documents
    };
  }
}

module.exports = ReviewService;
