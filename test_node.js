console.log('Node.js 测试');
console.log('Node版本:', process.version);
console.log('当前目录:', process.cwd());

try {
  const express = require('express');
  console.log('✅ Express 可用');
  
  const app = express();
  const port = 3001;
  
  app.get('/test', (req, res) => {
    res.json({ message: 'Node.js 服务器运行正常' });
  });
  
  app.listen(port, () => {
    console.log(`🚀 测试服务器启动成功: http://localhost:${port}`);
  });
  
} catch (error) {
  console.error('❌ 错误:', error.message);
}
