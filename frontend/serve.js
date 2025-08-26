const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8080;

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './login.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>404 - 页面不存在</h1>
              <p>请访问以下页面：</p>
              <ul>
                <li><a href="/login.html">登录页面</a></li>
                <li><a href="/admin-dashboard.html">管理员仪表板</a></li>
              </ul>
            </body>
          </html>
        `);
      } else {
        // 服务器错误
        res.writeHead(500);
        res.end('服务器错误: ' + error.code);
      }
    } else {
      // 成功返回文件
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => {
  console.log(`🌐 前端服务器运行在 http://localhost:${port}`);
  console.log(`📱 登录页面: http://localhost:${port}/login.html`);
  console.log(`👑 管理员页面: http://localhost:${port}/admin-dashboard.html`);
});
