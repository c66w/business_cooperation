# 使用unstructured基础镜像
FROM downloads.unstructured.io/unstructured-io/unstructured:latest

# 设置工作目录
WORKDIR /app

# 安装Node.js和npm (用于前端和后端)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY document_service/requirements.txt /app/document_service/
RUN pip install --no-cache-dir -r document_service/requirements.txt

# 复制Python服务代码
COPY document_service/ /app/document_service/

# 复制后端代码
COPY backend/ /app/backend/

# 安装后端依赖
WORKDIR /app/backend
RUN npm install

# 复制前端代码
COPY frontend/ /app/frontend/

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm install && npm run build

# 创建启动脚本
WORKDIR /app
RUN echo '#!/bin/bash\n\
# 启动Python服务\n\
cd /app/document_service && python start_service.py &\n\
\n\
# 等待Python服务启动\n\
sleep 5\n\
\n\
# 在生产环境中，后端服务器会同时服务API和前端静态文件\n\
# 启动后端服务（包含前端静态文件服务）\n\
cd /app/backend && node server.js\n\
' > start.sh && chmod +x start.sh

# 暴露端口
EXPOSE 6415 3001 8000

# 设置环境变量
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV FRONTEND_PORT=6415
ENV BACKEND_PORT=3001
ENV PYTHON_SERVICE_PORT=8000

# 启动命令
CMD ["./start.sh"]
