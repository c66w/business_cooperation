# OSS配置指南

## 🔧 配置真实的阿里云OSS

### 1. 获取OSS配置信息

请在阿里云控制台获取以下信息：

1. **Access Key ID**: 您的阿里云访问密钥ID
2. **Access Key Secret**: 您的阿里云访问密钥Secret
3. **Bucket Name**: OSS存储桶名称
4. **Endpoint**: OSS服务端点（如：oss-cn-hangzhou.aliyuncs.com）

### 2. 配置环境变量

编辑 `document_service/.env` 文件：

```bash
# OSS配置 (请替换为真实配置)
OSS_ACCESS_KEY_ID=your_real_access_key_id
OSS_ACCESS_KEY_SECRET=your_real_secret_key
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=your_bucket_name
OSS_DOMAIN=https://your_bucket_name.oss-cn-hangzhou.aliyuncs.com
```

### 3. 测试OSS连接

运行测试脚本：

```bash
cd document_service
python test_oss.py
```

### 4. 启动文档服务

```bash
cd document_service
python start_document_service.py
```

## 🚀 功能说明

### 文档上传
- 支持PDF、Word、图片格式
- 自动上传到OSS
- 生成唯一的文件名
- 返回OSS访问URL

### 文档删除
- 前端点击删除按钮
- 后端删除OSS文件
- 清理数据库记录

### 文档管理
- 获取文档信息
- 查看上传状态
- 管理文件列表

## 🔍 故障排除

### 1. OSS连接失败
- 检查Access Key和Secret是否正确
- 确认Bucket名称和Endpoint
- 检查网络连接

### 2. 文件上传失败
- 检查文件大小限制（10MB）
- 确认文件格式支持
- 查看服务器日志

### 3. 文档删除失败
- 确认文档ID存在
- 检查OSS权限配置
- 查看错误日志

## 📋 当前状态

- ✅ 本地文件存储（备用方案）
- ⚠️ OSS配置需要真实凭证
- ⚠️ Python文档服务需要启动
- ✅ 文档删除功能已实现
