/**
 * 通知Agent
 * 负责发送各种类型的通知（邮件、短信、系统通知等）
 */

const BaseAgent = require('./BaseAgent');
const { v4: uuidv4 } = require('uuid');

class NotificationAgent extends BaseAgent {
  constructor(config = {}) {
    super('NotificationAgent', config);
    
    // 通知模板
    this.templates = {
      merchant_submission_confirmation: {
        title: '商家合作申请提交成功',
        content: '您好 {{company_name}}，您的合作申请已成功提交，我们将在 {{review_time}} 小时内完成审核。申请编号：{{user_id}}',
        channels: ['email', 'system']
      },
      reviewer_task_assigned: {
        title: '新的审核任务分配',
        content: '您好 {{reviewer_name}}，有新的商家审核任务分配给您。商家：{{company_name}}，申请编号：{{user_id}}，请及时处理。',
        channels: ['email', 'system']
      },
      merchant_approved: {
        title: '商家合作申请审核通过',
        content: '恭喜！{{company_name}} 的合作申请已通过审核。我们的商务人员将在 24 小时内与您联系，开始合作洽谈。',
        channels: ['email', 'system']
      },
      merchant_rejected: {
        title: '商家合作申请审核结果',
        content: '很抱歉，{{company_name}} 的合作申请未能通过审核。原因：{{rejection_reason}}。如有疑问，请联系我们的客服。',
        channels: ['email', 'system']
      },
      reviewer_task_overdue: {
        title: '审核任务超时提醒',
        content: '您好 {{reviewer_name}}，您有一个审核任务已超时。商家：{{company_name}}，申请编号：{{user_id}}，请尽快处理。',
        channels: ['email', 'system']
      }
    };

    // 通知渠道配置
    this.channels = {
      email: {
        enabled: config.email?.enabled || false,
        provider: config.email?.provider || 'smtp',
        config: config.email?.config || {}
      },
      sms: {
        enabled: config.sms?.enabled || false,
        provider: config.sms?.provider || 'aliyun',
        config: config.sms?.config || {}
      },
      system: {
        enabled: true
      },
      webhook: {
        enabled: config.webhook?.enabled || false,
        urls: config.webhook?.urls || []
      }
    };
  }

  /**
   * 处理通知任务
   * @param {Object} task - 通知任务
   * @returns {Promise<Object>} 处理结果
   */
  async process(task) {
    const { templateName, recipient, variables, channels, priority } = task;

    // 验证模板
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Unknown notification template: ${templateName}`);
    }

    // 确定发送渠道
    const sendChannels = channels || template.channels;
    
    // 生成通知内容
    const notification = this.generateNotification(template, variables);
    
    // 创建通知记录
    const notificationId = uuidv4();
    const notificationRecord = {
      notification_id: notificationId,
      user_id: recipient.userId,
      recipient_type: recipient.type,
      recipient_email: recipient.email,
      recipient_phone: recipient.phone,
      template_name: templateName,
      title: notification.title,
      content: notification.content,
      variables: JSON.stringify(variables),
      priority: priority || 'medium'
    };

    const results = [];

    // 通过各个渠道发送通知
    for (const channel of sendChannels) {
      if (this.channels[channel]?.enabled) {
        try {
          const result = await this.sendNotification(channel, notification, recipient, notificationRecord);
          results.push({
            channel,
            success: true,
            result
          });
        } catch (error) {
          console.error(`Failed to send notification via ${channel}:`, error);
          results.push({
            channel,
            success: false,
            error: error.message
          });
        }
      }
    }

    return {
      notificationId,
      templateName,
      recipient,
      results,
      success: results.some(r => r.success)
    };
  }

  /**
   * 生成通知内容
   * @param {Object} template - 通知模板
   * @param {Object} variables - 变量
   * @returns {Object} 生成的通知内容
   */
  generateNotification(template, variables) {
    let title = template.title;
    let content = template.content;

    // 替换变量
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return { title, content };
  }

  /**
   * 发送通知
   * @param {string} channel - 发送渠道
   * @param {Object} notification - 通知内容
   * @param {Object} recipient - 接收者信息
   * @param {Object} record - 通知记录
   * @returns {Promise<Object>} 发送结果
   */
  async sendNotification(channel, notification, recipient, record) {
    switch (channel) {
      case 'email':
        return await this.sendEmail(notification, recipient, record);
      case 'sms':
        return await this.sendSMS(notification, recipient, record);
      case 'system':
        return await this.sendSystemNotification(notification, recipient, record);
      case 'webhook':
        return await this.sendWebhook(notification, recipient, record);
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  /**
   * 发送邮件通知
   * @param {Object} notification - 通知内容
   * @param {Object} recipient - 接收者
   * @param {Object} record - 通知记录
   * @returns {Promise<Object>} 发送结果
   */
  async sendEmail(notification, recipient, record) {
    if (!recipient.email) {
      throw new Error('Recipient email is required for email notification');
    }

    // 这里集成实际的邮件发送服务
    // 例如：SendGrid, AWS SES, 阿里云邮件推送等
    
    console.log(`[Email] Sending to ${recipient.email}: ${notification.title}`);
    
    // 模拟邮件发送
    const emailResult = {
      messageId: uuidv4(),
      status: 'sent',
      sentAt: new Date()
    };

    // 保存通知记录
    await this.saveNotificationRecord({
      ...record,
      channel: 'email',
      status: 'sent',
      sent_at: emailResult.sentAt
    });

    return emailResult;
  }

  /**
   * 发送短信通知
   * @param {Object} notification - 通知内容
   * @param {Object} recipient - 接收者
   * @param {Object} record - 通知记录
   * @returns {Promise<Object>} 发送结果
   */
  async sendSMS(notification, recipient, record) {
    if (!recipient.phone) {
      throw new Error('Recipient phone is required for SMS notification');
    }

    // 这里集成实际的短信发送服务
    // 例如：阿里云短信、腾讯云短信等
    
    console.log(`[SMS] Sending to ${recipient.phone}: ${notification.title}`);
    
    // 模拟短信发送
    const smsResult = {
      messageId: uuidv4(),
      status: 'sent',
      sentAt: new Date()
    };

    // 保存通知记录
    await this.saveNotificationRecord({
      ...record,
      channel: 'sms',
      status: 'sent',
      sent_at: smsResult.sentAt
    });

    return smsResult;
  }

  /**
   * 发送系统内通知
   * @param {Object} notification - 通知内容
   * @param {Object} recipient - 接收者
   * @param {Object} record - 通知记录
   * @returns {Promise<Object>} 发送结果
   */
  async sendSystemNotification(notification, recipient, record) {
    console.log(`[System] Notification for ${recipient.userId}: ${notification.title}`);
    
    // 保存系统通知记录
    const systemResult = {
      notificationId: record.notification_id,
      status: 'delivered',
      deliveredAt: new Date()
    };

    // 保存通知记录
    await this.saveNotificationRecord({
      ...record,
      channel: 'system',
      status: 'delivered',
      sent_at: systemResult.deliveredAt,
      delivered_at: systemResult.deliveredAt
    });

    return systemResult;
  }

  /**
   * 发送Webhook通知
   * @param {Object} notification - 通知内容
   * @param {Object} recipient - 接收者
   * @param {Object} record - 通知记录
   * @returns {Promise<Object>} 发送结果
   */
  async sendWebhook(notification, recipient, record) {
    const webhookUrls = this.channels.webhook.urls;
    if (!webhookUrls || webhookUrls.length === 0) {
      throw new Error('No webhook URLs configured');
    }

    const payload = {
      notificationId: record.notification_id,
      templateName: record.template_name,
      recipient,
      notification,
      timestamp: new Date()
    };

    const results = [];
    
    for (const url of webhookUrls) {
      try {
        // 这里发送HTTP请求到webhook URL
        console.log(`[Webhook] Sending to ${url}: ${notification.title}`);
        
        // 模拟webhook发送
        const webhookResult = {
          url,
          status: 'sent',
          sentAt: new Date()
        };
        
        results.push(webhookResult);
      } catch (error) {
        console.error(`Webhook failed for ${url}:`, error);
        results.push({
          url,
          status: 'failed',
          error: error.message
        });
      }
    }

    // 保存通知记录
    await this.saveNotificationRecord({
      ...record,
      channel: 'webhook',
      status: results.some(r => r.status === 'sent') ? 'sent' : 'failed',
      sent_at: new Date()
    });

    return { webhooks: results };
  }

  /**
   * 保存通知记录到数据库
   * @param {Object} record - 通知记录
   * @returns {Promise<void>}
   */
  async saveNotificationRecord(record) {
    // 这里应该保存到数据库
    // 暂时只打印日志
    console.log(`[NotificationRecord] Saved: ${record.notification_id} - ${record.channel} - ${record.status}`);
  }

  /**
   * 批量发送通知
   * @param {Array} notifications - 通知列表
   * @returns {Promise<Array>} 发送结果列表
   */
  async sendBatch(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.process(notification);
        results.push(result);
      } catch (error) {
        console.error('Batch notification failed:', error);
        results.push({
          success: false,
          error: error.message,
          notification
        });
      }
    }

    return results;
  }

  /**
   * 重试失败的通知
   * @param {string} notificationId - 通知ID
   * @returns {Promise<Object>} 重试结果
   */
  async retryNotification(notificationId) {
    // 这里应该从数据库获取通知记录并重试
    console.log(`[NotificationAgent] Retrying notification: ${notificationId}`);
    
    // 实现重试逻辑
    return {
      success: true,
      retried: true,
      notificationId
    };
  }

  /**
   * 获取通知模板列表
   * @returns {Array} 模板列表
   */
  getTemplates() {
    return Object.keys(this.templates).map(key => ({
      name: key,
      title: this.templates[key].title,
      channels: this.templates[key].channels
    }));
  }

  /**
   * 获取支持的通知渠道
   * @returns {Array} 渠道列表
   */
  getSupportedChannels() {
    return Object.keys(this.channels).filter(channel => this.channels[channel].enabled);
  }
}

module.exports = NotificationAgent;
