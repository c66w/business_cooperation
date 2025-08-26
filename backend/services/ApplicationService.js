const { v4: uuidv4 } = require('uuid');

/**
 * 商家申请服务
 * 替代复杂的Agent系统，提供直接的业务逻辑
 */
class ApplicationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * 提交商家申请
   * @param {Object} applicationData - 申请数据
   * @param {Array} files - 上传的文件
   * @param {Object} user - 当前登录用户信息
   * @returns {Promise<Object>} 提交结果
   */
  async submitApplication(applicationData, files = [], user = null) {
    const transaction = await this.db.beginTransaction();

    try {
      // 1. 使用当前用户ID，如果没有则生成新的
      const userId = user?.user_id || user?.id || `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 2. 验证数据
      const validationResult = this.validateApplicationData(applicationData);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 3. 保存基础申请信息
      await this.saveBasicApplication(transaction, userId, applicationData);

      // 4. 保存动态字段
      await this.saveDynamicFields(transaction, userId, applicationData);

      // 5. 保存文件信息
      if (files && files.length > 0) {
        await this.saveFiles(transaction, userId, files);
      }

      // 6. 创建审核任务
      const taskId = await this.createReviewTask(transaction, userId, applicationData);

      // 7. 分配审核员
      const assignedReviewer = await this.assignReviewer(transaction, taskId, userId);

      // 8. 记录提交历史
      await this.logHistory(transaction, userId, 'submitted', 'merchant', userId, 
        '商家提交申请', null, 'submitted');

      await transaction.commit();

      console.log(`✅ 商家申请提交成功: ${applicationData.company_name} (${userId})`);

      return {
        success: true,
        userId,
        taskId,
        assignedReviewer,
        message: '申请提交成功'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ 申请提交失败:', error);
      throw error;
    }
  }

  /**
   * 验证申请数据
   * @param {Object} data - 申请数据
   * @returns {Object} 验证结果
   */
  validateApplicationData(data) {
    const errors = [];
    
    // 基础字段验证
    if (!data.company_name) errors.push('公司名称不能为空');
    if (!data.merchant_type) errors.push('商家类型不能为空');
    if (!data.contact_name) errors.push('联系人姓名不能为空');
    if (!data.contact_phone) errors.push('联系人电话不能为空');
    if (!data.product_category) errors.push('产品品类不能为空');
    if (!data.specific_products) errors.push('具体产品不能为空');

    // 商家类型特定验证
    if (data.merchant_type === 'factory') {
      if (!data.annual_production_capacity) errors.push('年生产规模不能为空');
      if (!data.accept_deep_cooperation) errors.push('是否接受深度合作不能为空');
    }

    // 电话格式验证
    if (data.contact_phone && !/^1[3-9]\d{9}$/.test(data.contact_phone)) {
      errors.push('联系人电话格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, 100 - errors.length * 10)
    };
  }

  /**
   * 保存基础申请信息
   */
  async saveBasicApplication(transaction, userId, data) {
    const sql = `
      INSERT INTO business_cooperation 
      (user_id, company_name, attendee_name, contact_info, merchant_type, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
    `;
    
    await transaction.execute(sql, [
      userId,
      data.company_name,
      data.contact_name,
      data.contact_phone,
      data.merchant_type
    ]);
  }

  /**
   * 保存动态字段
   */
  async saveDynamicFields(transaction, userId, data) {
    const dynamicFields = this.extractDynamicFields(data);

    for (const [fieldName, fieldValue] of Object.entries(dynamicFields)) {
      const sql = `
        INSERT INTO merchant_details
        (user_id, merchant_type, field_name, field_value, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await transaction.execute(sql, [userId, data.merchant_type, fieldName, String(fieldValue)]);
    }
  }

  /**
   * 提取动态字段
   */
  extractDynamicFields(data) {
    const staticFields = [
      'company_name', 'merchant_type', 'contact_name', 'contact_phone', 
      'contact_email', 'product_category', 'specific_products',
      'cooperation_requirements', 'industry_operator_contact'
    ];
    
    const dynamicFields = {};
    for (const [key, value] of Object.entries(data)) {
      if (!staticFields.includes(key) && value !== undefined && value !== null && value !== '') {
        dynamicFields[key] = value;
      }
    }
    
    return dynamicFields;
  }

  /**
   * 保存文件信息
   */
  async saveFiles(transaction, userId, files) {
    for (const file of files) {
      const sql = `
        INSERT INTO business_qualification_document 
        (user_id, file_name, file_url, file_type, upload_time)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      await transaction.execute(sql, [
        userId,
        file.originalname || file.name,
        file.path || `/uploads/${file.filename}`,
        file.mimetype || 'application/octet-stream'
      ]);
    }
  }

  /**
   * 创建审核任务
   */
  async createReviewTask(transaction, userId, data) {
    const taskId = uuidv4();
    
    const sql = `
      INSERT INTO workflow_tasks 
      (task_id, user_id, task_type, status, priority, title, description, created_at, updated_at)
      VALUES (?, ?, 'manual_review', 'pending', 'medium', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    await transaction.execute(sql, [
      taskId,
      userId,
      `商家申请审核 - ${data.company_name}`,
      `${data.merchant_type}类型商家申请审核`
    ]);
    
    return taskId;
  }

  /**
   * 分配审核员 - 默认分配给管理员
   */
  async assignReviewer(transaction, taskId, userId) {
    try {
      // 新申请默认分配给管理员，状态保持为pending
      const assignedReviewer = 'admin_001'; // 默认分配给管理员

      // 更新任务分配，但保持pending状态，等待管理员手动分配
      await transaction.execute(`
        UPDATE workflow_tasks
        SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
      `, [assignedReviewer, taskId]);

      // 记录分配历史
      await this.logHistory(transaction, userId, 'assigned', 'system', 'system',
        `新申请默认分配给管理员，等待手动分配`, null, 'pending', taskId);

      console.log(`✅ 新申请已分配给管理员: ${taskId} -> ${assignedReviewer}`);
      return assignedReviewer;

    } catch (error) {
      console.error('分配审核员失败:', error);
      return 'admin_001'; // 失败时也返回管理员
    }
  }

  /**
   * 记录历史
   */
  async logHistory(transaction, userId, action, actorType, actorId, comment, fromStatus, toStatus, taskId = null) {
    const sql = `
      INSERT INTO workflow_history 
      (user_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await transaction.execute(sql, [
      userId, taskId, action, actorType, actorId, actorId, fromStatus, toStatus, comment
    ]);
  }
}

module.exports = ApplicationService;
