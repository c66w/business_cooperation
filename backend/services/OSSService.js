/**
 * OSS存储服务 - 阿里云对象存储
 */

const OSS = require('ali-oss');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

class OSSService {
  constructor() {
    // 获取必需的环境变量
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION;

    // 检查必需的环境变量
    if (!accessKeyId) {
      throw new Error("OSS_ACCESS_KEY_ID environment variable is required");
    }
    if (!accessKeySecret) {
      throw new Error("OSS_ACCESS_KEY_SECRET environment variable is required");
    }
    if (!bucket) {
      throw new Error("OSS_BUCKET environment variable is required");
    }
    if (!region) {
      throw new Error("OSS_REGION environment variable is required");
    }

    // OSS配置
    this.config = {
      region: region,
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      bucket: bucket,
      endpoint: process.env.OSS_ENDPOINT,
      domain: process.env.OSS_DOMAIN,
      prefix: process.env.OSS_PREFIX || 'documents/business-cooperation/'
    };

    // 设置默认值
    if (!this.config.endpoint) {
      this.config.endpoint = `https://${region}.aliyuncs.com`;
    }
    if (!this.config.domain) {
      this.config.domain = `https://${bucket}.${region}.aliyuncs.com`;
    }

    // 初始化OSS客户端
    this.client = new OSS({
      region: this.config.region,
      accessKeyId: this.config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret,
      bucket: this.config.bucket,
      endpoint: this.config.endpoint
    });

    console.log('✅ OSS客户端初始化成功');
  }

  /**
   * 检查OSS服务状态
   */
  async checkStatus() {
    try {
      await this.client.getBucketInfo();
      return {
        status: 'connected',
        bucket: this.config.bucket
      };
    } catch (error) {
      console.error('OSS状态检查失败:', error);
      throw error;
    }
  }

  /**
   * 生成文件存储键
   */
  generateFileKey(userId, originalFilename, prefix = null) {
    const timestamp = Date.now();
    const randomStr = crypto.createHash('md5')
      .update(`${timestamp}${userId}`)
      .digest('hex')
      .substring(0, 8);

    const parsedPath = path.parse(originalFilename);
    const ext = parsedPath.ext;
    const baseName = parsedPath.name;

    // 清理文件名中的特殊字符
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');

    // 使用传入的前缀或环境变量中的前缀
    const ossPrefix = prefix || this.config.prefix;

    return `${ossPrefix}${userId}/${timestamp}_${randomStr}_${cleanBaseName}${ext}`;
  }

  /**
   * 上传文件到OSS
   */
  async uploadFile(fileData, fileKey, contentType = 'application/octet-stream') {
    try {
      const options = {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'max-age=31536000' // 1年缓存
        }
      };

      const result = await this.client.put(fileKey, fileData, options);

      if (result.res.status !== 200) {
        throw new Error(`上传失败，状态码: ${result.res.status}`);
      }

      const ossUrl = `${this.config.domain}/${fileKey}`;
      console.log(`✅ OSS上传成功: ${fileKey}`);

      return {
        success: true,
        oss_url: ossUrl,
        oss_key: fileKey,
        file_size: Buffer.isBuffer(fileData) ? fileData.length : fileData.size,
        etag: result.etag
      };
    } catch (error) {
      console.error('OSS上传失败:', error);
      throw error;
    }
  }

  /**
   * 下载OSS文件到内存
   */
  async downloadFile(fileKey) {
    try {
      console.log(`📥 开始下载文件: ${fileKey}`);

      const result = await this.client.get(fileKey);
      const fileData = result.content;

      console.log(`✅ 文件下载成功: ${fileKey}, 大小: ${fileData.length} 字节`);

      return fileData;
    } catch (error) {
      console.error('OSS下载失败:', error);
      throw error;
    }
  }

  /**
   * 删除OSS文件
   */
  async deleteFile(fileKey) {
    try {
      await this.client.delete(fileKey);
      console.log(`✅ OSS删除成功: ${fileKey}`);
      return { success: true };
    } catch (error) {
      console.error('OSS删除失败:', error);
      throw error;
    }
  }

}

// 全局OSS服务实例
let ossService = null;

/**
 * 获取OSS服务实例
 */
function getOSSService() {
  if (!ossService) {
    ossService = new OSSService();
  }
  return ossService;
}

module.exports = {
  OSSService,
  getOSSService
};
