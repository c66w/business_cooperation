# 使用unstructured基础镜像
FROM downloads.unstructured.io/unstructured-io/unstructured:latest

# 设置工作目录
WORKDIR /app

# 切换到root用户安装软件包
USER root

# 安装Node.js和npm (用于前端和后端) - 适配Wolfi Linux
RUN apk update && apk add \
    curl \
    nodejs \
    npm \
    bash \
    && rm -rf /var/cache/apk/*

# 切换回原用户
USER notebook-user

# 安装Python依赖
COPY document_service/requirements.txt /app/document_service/
RUN pip install --no-cache-dir -r document_service/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制Python服务代码
COPY document_service/ /app/document_service/

# 复制后端代码
COPY backend/ /app/backend/

# 切换到root用户进行npm安装
USER root

# 安装后端依赖
WORKDIR /app/backend
RUN npm install

# 复制前端代码
COPY frontend/ /app/frontend/

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm install && npm run build

# 创建启动脚本 (保持root权限)
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

# 切换回notebook-user
USER notebook-user

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
