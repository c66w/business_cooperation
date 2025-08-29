/**
 * 日志工具
 * 在生产环境中禁用console.log，在开发环境中保留
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // 错误日志在生产环境中也应该保留
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // 用于API调用的专门日志
  api: (method, url, data = null) => {
    if (isDevelopment) {
      console.log(`🌐 API ${method.toUpperCase()}: ${url}`, data ? data : '');
    }
  },
  
  // 用于组件生命周期的日志
  component: (componentName, action, data = null) => {
    if (isDevelopment) {
      console.log(`🔧 ${componentName}: ${action}`, data ? data : '');
    }
  },
  
  // 用于表单操作的日志
  form: (formName, action, data = null) => {
    if (isDevelopment) {
      console.log(`📝 ${formName}: ${action}`, data ? data : '');
    }
  }
};

export default logger;
