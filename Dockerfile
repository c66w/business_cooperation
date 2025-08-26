# 使用unstructured基础镜像
FROM downloads.unstructured.io/unstructured-io/unstructured:latest

# 设置工作目录
WORKDIR /app

# 切换到root用户并保持
USER root

# 安装Node.js和npm (用于前端和后端) - 适配Wolfi Linux
RUN apk add \
    curl \
    nodejs \
    npm \
    bash \
    && rm -rf /var/cache/apk/*

# 安装Python依赖
COPY document_service/requirements.txt /app/document_service/
RUN pip install --no-cache-dir -r document_service/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制Python服务代码
COPY document_service/ /app/document_service/

# 复制后端代码
COPY backend/ /app/backend/

# 安装后端依赖 (已经是root用户)
WORKDIR /app/backend
RUN npm install

# 复制前端代码
COPY frontend/ /app/frontend/

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm install && npm run build

# 创建启动脚本 (root权限)
WORKDIR /app
RUN echo '#!/bin/bash' > start.sh && \
    echo '# 启动Python服务' >> start.sh && \
    echo 'cd /app/document_service && python start_service.py &' >> start.sh && \
    echo '' >> start.sh && \
    echo '# 等待Python服务启动' >> start.sh && \
    echo 'sleep 5' >> start.sh && \
    echo '' >> start.sh && \
    echo '# 启动后端服务（后台运行）' >> start.sh && \
    echo 'cd /app/backend && node server.js &' >> start.sh && \
    echo '' >> start.sh && \
    echo '# 等待后端服务启动' >> start.sh && \
    echo 'sleep 3' >> start.sh && \
    echo '' >> start.sh && \
    echo '# 启动前端服务（前台运行）' >> start.sh && \
    echo 'cd /app/frontend && npm start' >> start.sh && \
    chmod +x start.sh && \
    ls -la start.sh && \
    cat start.sh

# 保持root用户运行

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
