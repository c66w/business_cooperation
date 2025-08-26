#!/usr/bin/env node

/**
 * 简化的后端服务器启动脚本
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 基础路由
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Node.js Backend',
    timestamp: new Date().toISOString()
  });
});

// 模拟认证路由
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'demo-token-' + Date.now(),
    user: {
      id: 'user123',
      username: 'demo',
      role: 'merchant'
    }
  });
});

// 模拟文档路由
app.post('/api/document/upload', (req, res) => {
  res.json({
    success: true,
    message: '文档上传成功',
    data: {
      document_id: Date.now(),
      file_name: 'demo.pdf',
      file_size: 1024
    }
  });
});

app.get('/api/document/list', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        file_name: 'demo.pdf',
        original_name: '示例文档.pdf',
        file_size: 1024,
        file_type: 'pdf',
        upload_time: new Date().toISOString(),
        status: 'uploaded'
      }
    ]
  });
});

// 模拟审核路由
app.get('/api/review/list', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Node.js后端服务器启动成功!`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📝 API前缀: http://localhost:${PORT}/api`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
});
