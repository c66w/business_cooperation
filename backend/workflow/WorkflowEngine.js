/**
 * 工作流引擎
 * 负责协调各个Agent，管理工作流状态和任务流转
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class WorkflowEngine extends EventEmitter {
  constructor(agents, config = {}) {
    super();
    this.agents = agents;
    this.config = config;
    this.activeWorkflows = new Map();
    this.workflowDefinitions = this.initializeWorkflowDefinitions();
    
    this.setupEventHandlers();
  }

  /**
   * 初始化工作流定义
   */
  initializeWorkflowDefinitions() {
    return {
      'merchant_onboarding': {
        name: '商家入驻流程',
        steps: [
          {
            id: 'data_collection',
            name: '数据收集',
            agent: 'DataCollectionAgent',
            type: 'automatic',
            nextSteps: ['data_save']
          },
          {
            id: 'data_save',
            name: '数据保存',
            agent: 'SystemAgent',
            type: 'automatic',
            nextSteps: ['validation']
          },
          {
            id: 'validation',
            name: '数据验证',
            agent: 'ValidationAgent',
            type: 'automatic',
            nextSteps: ['review', 'manual_review']
          },
          {
            id: 'review',
            name: '人工审核',
            agent: 'ReviewAgent',
            type: 'manual',
            nextSteps: ['approval', 'rejection', 'modification']
          },
          {
            id: 'manual_review',
            name: '手动审核',
            agent: 'ReviewAgent',
            type: 'manual',
            nextSteps: ['approval', 'rejection', 'modification']
          },
          {
            id: 'approval',
            name: '审核通过',
            agent: 'SystemAgent',
            type: 'automatic',
            nextSteps: []
          },
          {
            id: 'rejection',
            name: '审核拒绝',
            agent: 'SystemAgent',
            type: 'automatic',
            nextSteps: []
          },
          {
            id: 'modification',
            name: '请求修改',
            agent: 'SystemAgent',
            type: 'automatic',
            nextSteps: ['data_collection']
          }
        ]
      }
    };
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.on('workflow:start', this.onWorkflowStart.bind(this));
    this.on('workflow:step:complete', this.onStepComplete.bind(this));
    this.on('workflow:complete', this.onWorkflowComplete.bind(this));
    this.on('workflow:error', this.onWorkflowError.bind(this));
  }

  /**
   * 启动工作流
   * @param {string} workflowType - 工作流类型
   * @param {Object} initialData - 初始数据
   * @returns {Promise<string>} 工作流ID
   */
  async startWorkflow(workflowType, initialData) {
    const workflowId = uuidv4();
    const definition = this.workflowDefinitions[workflowType];
    
    if (!definition) {
      throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    const workflow = {
      id: workflowId,
      type: workflowType,
      definition,
      currentStep: definition.steps[0],
      data: initialData,
      status: 'running',
      startedAt: new Date(),
      history: []
    };

    this.activeWorkflows.set(workflowId, workflow);
    this.emit('workflow:start', { workflow });

    // 执行第一步
    await this.executeStep(workflowId, workflow.currentStep);

    return workflowId;
  }

  /**
   * 执行工作流步骤
   * @param {string} workflowId - 工作流ID
   * @param {Object} step - 步骤定义
   * @param {Object} stepData - 步骤数据
   */
  async executeStep(workflowId, step, stepData = null) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    try {
      console.log(`[Workflow ${workflowId}] Executing step: ${step.name}`);

      // 记录步骤开始
      this.addWorkflowHistory(workflow, {
        action: 'step_start',
        stepId: step.id,
        stepName: step.name,
        timestamp: new Date()
      });

      let result;

      if (step.type === 'automatic') {
        // 自动执行步骤
        result = await this.executeAutomaticStep(workflow, step, stepData);
      } else if (step.type === 'manual') {
        // 手动步骤，创建任务等待人工处理
        result = await this.createManualTask(workflow, step, stepData);
      }

      // 记录步骤完成
      this.addWorkflowHistory(workflow, {
        action: 'step_complete',
        stepId: step.id,
        stepName: step.name,
        result,
        timestamp: new Date()
      });

      this.emit('workflow:step:complete', { workflow, step, result });

      // 如果是自动步骤且有结果，继续下一步
      if (step.type === 'automatic' && result) {
        await this.processStepResult(workflowId, step, result);
      }

    } catch (error) {
      console.error(`[Workflow ${workflowId}] Step execution failed:`, error);
      
      this.addWorkflowHistory(workflow, {
        action: 'step_error',
        stepId: step.id,
        stepName: step.name,
        error: error.message,
        timestamp: new Date()
      });

      this.emit('workflow:error', { workflow, step, error });
      await this.handleWorkflowError(workflowId, error);
    }
  }

  /**
   * 执行自动步骤
   * @param {Object} workflow - 工作流实例
   * @param {Object} step - 步骤定义
   * @param {Object} stepData - 步骤数据
   * @returns {Promise<Object>} 执行结果
   */
  async executeAutomaticStep(workflow, step, stepData) {
    const agent = this.agents[step.agent];
    if (!agent) {
      throw new Error(`Agent not found: ${step.agent}`);
    }

    // 准备任务数据
    const task = {
      workflowId: workflow.id,
      stepId: step.id,
      data: stepData || workflow.data,
      ...workflow.data
    };

    // 执行Agent任务
    const result = await agent.execute(task);
    
    if (!result.success) {
      throw new Error(result.error || 'Agent execution failed');
    }

    return result;
  }

  /**
   * 创建手动任务
   * @param {Object} workflow - 工作流实例
   * @param {Object} step - 步骤定义
   * @param {Object} stepData - 步骤数据
   * @returns {Promise<Object>} 任务创建结果
   */
  async createManualTask(workflow, step, stepData) {
    const systemAgent = this.agents['SystemAgent'];
    if (!systemAgent) {
      throw new Error('SystemAgent not found');
    }

    // 创建工作流任务
    const taskResult = await systemAgent.execute({
      action: 'create_workflow_task',
      data: {
        userId: workflow.data.userId || workflow.data.processedData?.userId,
        taskType: step.id,
        validationResult: workflow.data.validationResult
      }
    });

    if (!taskResult.success) {
      throw new Error('Failed to create manual task');
    }

    // 分配审核员
    const assignResult = await systemAgent.execute({
      action: 'assign_reviewer',
      data: {
        taskId: taskResult.result.taskId,
        userId: workflow.data.userId || workflow.data.processedData?.userId,
        preferredReviewer: workflow.data.preferredReviewer
      }
    });

    return {
      taskId: taskResult.result.taskId,
      assignedReviewer: assignResult.result?.assignedReviewer,
      status: 'waiting_for_manual_action'
    };
  }

  /**
   * 处理步骤结果
   * @param {string} workflowId - 工作流ID
   * @param {Object} step - 当前步骤
   * @param {Object} result - 步骤结果
   */
  async processStepResult(workflowId, step, result) {
    const workflow = this.activeWorkflows.get(workflowId);
    
    // 更新工作流数据
    workflow.data = { ...workflow.data, ...result.result };

    // 确定下一步
    const nextStep = this.determineNextStep(step, result);
    
    if (nextStep) {
      workflow.currentStep = nextStep;
      await this.executeStep(workflowId, nextStep);
    } else {
      // 工作流完成
      await this.completeWorkflow(workflowId);
    }
  }

  /**
   * 确定下一步
   * @param {Object} currentStep - 当前步骤
   * @param {Object} result - 步骤结果
   * @returns {Object|null} 下一步定义
   */
  determineNextStep(currentStep, result) {
    const { nextSteps } = currentStep;
    
    if (!nextSteps || nextSteps.length === 0) {
      return null; // 工作流结束
    }

    // 根据结果确定下一步
    if (currentStep.id === 'validation') {
      const validationPassed = result.result?.validationPassed;
      const nextStepId = validationPassed ? 'review' : 'manual_review';
      return this.findStepById(nextStepId);
    }

    // 默认取第一个下一步
    return this.findStepById(nextSteps[0]);
  }

  /**
   * 根据ID查找步骤
   * @param {string} stepId - 步骤ID
   * @returns {Object|null} 步骤定义
   */
  findStepById(stepId) {
    // 这里简化处理，实际应该从当前工作流定义中查找
    const allSteps = this.workflowDefinitions['merchant_onboarding'].steps;
    return allSteps.find(step => step.id === stepId) || null;
  }

  /**
   * 完成工作流
   * @param {string} workflowId - 工作流ID
   */
  async completeWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'completed';
    workflow.completedAt = new Date();

    this.addWorkflowHistory(workflow, {
      action: 'workflow_complete',
      timestamp: new Date()
    });

    this.emit('workflow:complete', { workflow });
    
    // 清理活动工作流
    this.activeWorkflows.delete(workflowId);
  }

  /**
   * 处理工作流错误
   * @param {string} workflowId - 工作流ID
   * @param {Error} error - 错误对象
   */
  async handleWorkflowError(workflowId, error) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'error';
    workflow.error = error.message;
    workflow.errorAt = new Date();

    // 可以在这里实现错误恢复逻辑
    console.error(`Workflow ${workflowId} failed:`, error.message);
  }

  /**
   * 手动推进工作流（用于人工审核完成后）
   * @param {string} workflowId - 工作流ID
   * @param {string} stepId - 步骤ID
   * @param {Object} result - 人工处理结果
   */
  async advanceWorkflow(workflowId, stepId, result) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.currentStep.id !== stepId) {
      throw new Error(`Invalid step transition: expected ${workflow.currentStep.id}, got ${stepId}`);
    }

    // 处理人工审核结果
    await this.processStepResult(workflowId, workflow.currentStep, { success: true, result });
  }

  /**
   * 添加工作流历史记录
   * @param {Object} workflow - 工作流实例
   * @param {Object} historyEntry - 历史条目
   */
  addWorkflowHistory(workflow, historyEntry) {
    workflow.history.push(historyEntry);
  }

  /**
   * 获取工作流状态
   * @param {string} workflowId - 工作流ID
   * @returns {Object|null} 工作流状态
   */
  getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return null;

    return {
      id: workflow.id,
      type: workflow.type,
      status: workflow.status,
      currentStep: workflow.currentStep,
      startedAt: workflow.startedAt,
      completedAt: workflow.completedAt,
      history: workflow.history
    };
  }

  /**
   * 获取所有活动工作流
   * @returns {Array} 活动工作流列表
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({
      id: workflow.id,
      type: workflow.type,
      status: workflow.status,
      currentStep: workflow.currentStep,
      startedAt: workflow.startedAt
    }));
  }

  // ==================== 事件处理器 ====================

  onWorkflowStart({ workflow }) {
    console.log(`[WorkflowEngine] Workflow started: ${workflow.id} (${workflow.type})`);
  }

  onStepComplete({ workflow, step, result }) {
    console.log(`[WorkflowEngine] Step completed: ${workflow.id} - ${step.name}`);
  }

  onWorkflowComplete({ workflow }) {
    console.log(`[WorkflowEngine] Workflow completed: ${workflow.id}`);
  }

  onWorkflowError({ workflow, step, error }) {
    console.error(`[WorkflowEngine] Workflow error: ${workflow.id} - ${step.name}: ${error.message}`);
  }
}

module.exports = WorkflowEngine;
