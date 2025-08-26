/**
 * 基础Agent类
 * 所有Agent的基类，定义了Agent的基本接口和通用功能
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class BaseAgent extends EventEmitter {
  constructor(name, config = {}) {
    super();
    this.id = uuidv4();
    this.name = name;
    this.config = config;
    this.status = 'idle'; // idle, busy, error
    this.createdAt = new Date();
    this.lastActivity = new Date();
    
    // 绑定事件处理器
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.on('task:start', this.onTaskStart.bind(this));
    this.on('task:complete', this.onTaskComplete.bind(this));
    this.on('task:error', this.onTaskError.bind(this));
  }

  /**
   * 处理任务 - 子类必须实现
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 处理结果
   */
  async process(task) {
    throw new Error('process method must be implemented by subclass');
  }

  /**
   * 验证任务 - 子类可以重写
   * @param {Object} task - 任务对象
   * @returns {boolean} 验证结果
   */
  validateTask(task) {
    return task && typeof task === 'object';
  }

  /**
   * 执行任务的通用流程
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 执行结果
   */
  async execute(task) {
    try {
      // 验证任务
      if (!this.validateTask(task)) {
        throw new Error('Invalid task provided');
      }

      // 检查Agent状态
      if (this.status === 'busy') {
        throw new Error('Agent is busy processing another task');
      }

      // 开始处理
      this.status = 'busy';
      this.emit('task:start', { agent: this, task });

      // 处理任务
      const result = await this.process(task);

      // 完成处理
      this.status = 'idle';
      this.lastActivity = new Date();
      this.emit('task:complete', { agent: this, task, result });

      return {
        success: true,
        result,
        agentId: this.id,
        agentName: this.name,
        processedAt: new Date()
      };

    } catch (error) {
      this.status = 'error';
      this.emit('task:error', { agent: this, task, error });
      
      return {
        success: false,
        error: error.message,
        agentId: this.id,
        agentName: this.name,
        processedAt: new Date()
      };
    }
  }

  /**
   * 任务开始事件处理器
   */
  onTaskStart({ agent, task }) {
    console.log(`[${agent.name}] Starting task: ${task.id || 'unknown'}`);
  }

  /**
   * 任务完成事件处理器
   */
  onTaskComplete({ agent, task, result }) {
    console.log(`[${agent.name}] Task completed: ${task.id || 'unknown'}`);
  }

  /**
   * 任务错误事件处理器
   */
  onTaskError({ agent, task, error }) {
    console.error(`[${agent.name}] Task error: ${error.message}`);
  }

  /**
   * 获取Agent状态信息
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      config: this.config
    };
  }

  /**
   * 重置Agent状态
   */
  reset() {
    this.status = 'idle';
    this.lastActivity = new Date();
    this.emit('agent:reset', { agent: this });
  }

  /**
   * 停止Agent
   */
  stop() {
    this.status = 'stopped';
    this.emit('agent:stop', { agent: this });
  }

  /**
   * 启动Agent
   */
  start() {
    this.status = 'idle';
    this.emit('agent:start', { agent: this });
  }
}

module.exports = BaseAgent;
