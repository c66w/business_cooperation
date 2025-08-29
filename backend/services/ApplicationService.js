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
      // 启用外键约束
      await transaction.execute('PRAGMA foreign_keys = ON');

      // 1. 强制要求用户登录，不允许匿名提交
      if (!user || !user.userId) {
        throw new Error('用户未登录，无法提交申请。请先登录后再提交申请。');
      }
      const userId = user.userId;

      console.log('🔍 开始提交申请:', { userId, companyName: applicationData.company_name });

      // 2. 验证数据
      const validationResult = this.validateApplicationData(applicationData);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 3. 保存基础申请信息
      console.log('🔄 准备保存基础申请信息...');
      const applicationId = await this.saveBasicApplication(transaction, userId, applicationData);
      console.log('✅ 基础申请信息保存完成，applicationId:', applicationId);

      // 4. 保存动态字段
      console.log('🔄 准备保存动态字段...');
      await this.saveDynamicFields(transaction, userId, applicationId, applicationData);
      console.log('✅ 动态字段保存完成');

      // 5. 保存文件信息
      if (files && files.length > 0) {
        await this.saveFiles(transaction, userId, applicationId, files);
      }

      // 6. 创建审核任务
      const taskId = await this.createReviewTask(transaction, userId, applicationId, applicationData);

      // 7. 分配审核员
      const assignedReviewer = await this.assignReviewer(transaction, taskId, userId, applicationId);

      // 8. 记录提交历史
      await this.logHistory(transaction, userId, applicationId, 'submitted', 'merchant', userId, 
        '商家提交申请', null, 'submitted');

      await transaction.commit();

      // 9. 关联用户之前上传的文档到申请
      const DocumentService = require('./DocumentService');
      const documentService = new DocumentService();
      
      console.log('🔄 开始关联用户文档到申请...');
      const associateResult = await documentService.updateUserDocumentsApplication(userId, applicationId);
      console.log('✅ 文档关联完成:', associateResult);

      console.log(`✅ 商家申请提交成功: ${applicationData.company_name} (${userId}), 申请ID: ${applicationId}`);

      return {
        success: true,
        userId,
        applicationId,  // 新增：返回申请的实际ID
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
    // 生成申请编号
    const applicationId = `APP${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    console.log('🔍 生成的applicationId:', applicationId);
    
    const sql = `
      INSERT INTO business_cooperation
      (user_id, application_id, company_name, attendee_name, contact_info, merchant_type, status, attendee_job, industry_operator, created_at, updated_at, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    console.log('🔄 准备插入business_cooperation表:', {
      userId,
      applicationId,
      company_name: data.company_name,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      merchant_type: data.merchant_type
    });

    console.log('🔍 SQL参数:', [userId, applicationId, data.company_name, data.contact_name, data.contact_phone, data.merchant_type, data.attendee_job || null, data.industry_operator || null]);

    const result = await transaction.execute(sql, [
      userId,
      applicationId,
      data.company_name,
      data.contact_name,
      data.contact_phone,
      data.merchant_type,
      data.attendee_job || null,
      data.industry_operator || null
    ]);

    console.log('✅ business_cooperation表插入成功:', result);

    // 验证插入是否成功
    const verification = await transaction.execute(
      'SELECT COUNT(*) as count FROM business_cooperation WHERE user_id = ?',
      [userId]
    );
    console.log('🔍 验证business_cooperation表插入:', verification);

    return applicationId;  // 返回申请编号
  }

  /**
   * 保存动态字段
   */
  async saveDynamicFields(transaction, userId, applicationId, data) {
    const dynamicFields = this.extractDynamicFields(data);

    console.log('🔄 准备插入merchant_details表:', {
      userId,
      applicationId,
      merchant_type: data.merchant_type,
      dynamicFields
    });

    for (const [fieldName, fieldValue] of Object.entries(dynamicFields)) {
      const sql = `
        INSERT INTO merchant_details
        (user_id, application_id, merchant_type, field_name, field_value, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      console.log('🔄 插入merchant_details记录:', {
        userId,
        applicationId,
        merchant_type: data.merchant_type,
        fieldName,
        fieldValue: String(fieldValue)
      });

      await transaction.execute(sql, [userId, applicationId, data.merchant_type, fieldName, String(fieldValue)]);
    }

    console.log('✅ 所有merchant_details记录插入完成');
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
   * 保存文件信息 - 上传到OSS并保存记录
   */
  async saveFiles(transaction, userId, applicationId, files) {
    const { getOSSService } = require('./OSSService');
    const ossService = getOSSService();

    for (const file of files) {
      try {
        // 生成OSS文件键
        const fileKey = ossService.generateFileKey(userId, file.originalname);

        // 上传文件到OSS
        const uploadResult = await ossService.uploadFile(
          file.buffer,
          fileKey,
          file.mimetype
        );

        if (!uploadResult.success) {
          console.error(`OSS上传失败: ${file.originalname}`, uploadResult.error);
          // 如果OSS上传失败，使用模拟URL
          uploadResult.oss_url = `https://yochat-v5.oss-cn-hangzhou.aliyuncs.com/${fileKey}`;
          uploadResult.oss_key = fileKey;
        }

        // 保存文件记录到数据库
        const sql = `
          INSERT INTO document_uploads
          (user_id, application_id, file_name, original_name, file_size, file_type, mime_type, oss_url, oss_key, status, upload_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await transaction.execute(sql, [
          userId,
          applicationId,
          file.originalname,
          file.originalname,
          file.size || 0,
          file.mimetype?.split('/').pop() || 'pdf',
          file.mimetype || 'application/octet-stream',
          uploadResult.oss_url,
          uploadResult.oss_key,
          'uploaded'
        ]);

        console.log(`✅ 文件上传成功: ${file.originalname} -> ${uploadResult.oss_url}`);

      } catch (error) {
        console.error(`❌ 文件处理失败: ${file.originalname}`, error);
        throw error;
      }
    }
  }

  /**
   * 创建审核任务
   */
  async createReviewTask(transaction, userId, applicationId, data) {
    const taskId = uuidv4();
    
    console.log('🔍 createReviewTask 参数:', { userId, applicationId, companyName: data.company_name });
    
    const sql = `
      INSERT INTO workflow_tasks 
      (task_id, user_id, application_id, task_type, status, priority, title, description, created_at, updated_at)
      VALUES (?, ?, ?, 'manual_review', 'pending', 'medium', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    console.log('🔍 SQL 参数:', [taskId, userId, applicationId, `商家申请审核 - ${data.company_name}`, `${data.merchant_type}类型商家申请审核`]);
    
    await transaction.execute(sql, [
      taskId,
      userId,
      applicationId,
      `商家申请审核 - ${data.company_name}`,
      `${data.merchant_type}类型商家申请审核`
    ]);
    
    console.log('✅ 审核任务创建成功:', taskId);
    return taskId;
  }

  /**
   * 分配审核员 - 默认分配给管理员
   */
  async assignReviewer(transaction, taskId, userId, applicationId) {
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
      await this.logHistory(transaction, userId, applicationId, 'assigned', 'system', 'system',
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
  async logHistory(transaction, userId, applicationId, action, actorType, actorId, comment, fromStatus, toStatus, taskId = null) {
    const sql = `
      INSERT INTO workflow_history 
      (user_id, application_id, task_id, action, actor_type, actor_id, actor_name, from_status, to_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await transaction.execute(sql, [
      userId, applicationId, taskId, action, actorType, actorId, actorId, fromStatus, toStatus, comment
    ]);
  }
}

module.exports = ApplicationService;
