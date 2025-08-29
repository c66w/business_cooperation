/**
 * 文档提取服务客户端
 * 基于Unstructured的文档内容提取，支持多种文件格式
 */

const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config();

/**
 * 提取的文档数据结构
 */
class ExtractedDocument {
  constructor(filename, elements, totalElements, fullText) {
    this.filename = filename;
    this.elements = elements;
    this.totalElements = totalElements;
    this.fullText = fullText;
  }

  /**
   * 从API响应创建实例
   */
  static fromApiResponse(responseData) {
    const elements = responseData.elements || [];
    const fullText = elements
      .filter(elem => elem.text)
      .map(elem => elem.text)
      .join('\n');

    return new ExtractedDocument(
      responseData.filename || '',
      elements,
      responseData.total_elements || elements.length,
      fullText
    );
  }
}

class DocumentExtractService {
  constructor() {
    // 检查必需的环境变量
    const baseUrl = process.env.DOCUMENT_EXTRACT_URL;
    const timeout = process.env.DOCUMENT_EXTRACT_TIMEOUT;

    if (!baseUrl) {
      throw new Error("DOCUMENT_EXTRACT_URL environment variable is required");
    }
    if (!timeout) {
      throw new Error("DOCUMENT_EXTRACT_TIMEOUT environment variable is required");
    }

    this.baseUrl = baseUrl;
    this.extractUrl = `${this.baseUrl}/extract`;
    this.timeout = parseInt(timeout) * 1000; // 转换为毫秒

    // 支持的文件格式
    this.supportedExtensions = new Set([
      '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.odt', '.epub',
      '.txt', '.html', '.xml', '.md', '.rst', '.json', '.rtf',
      '.csv', '.tsv', '.xlsx', '.xls',
      '.eml', '.msg',
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff',
      '.gz'
    ]);

    console.log(`📄 文档提取服务配置:`);
    console.log(`   URL: ${this.baseUrl}`);
    console.log(`   超时: ${this.timeout / 1000}秒`);
    console.log(`   支持格式: ${this.supportedExtensions.size}种`);
  }

  /**
   * 检查文档提取服务状态
   */
  async checkStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/docs`, { timeout: 10000 });
      if (response.status === 200) {
        return { status: 'connected', url: this.baseUrl };
      } else {
        return { status: 'error', code: response.status };
      }
    } catch (error) {
      console.error(`文档提取服务状态检查失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查文件格式是否支持
   */
  isSupportedFile(filePath) {
    const fileExt = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.has(fileExt);
  }

  /**
   * 从字节数据提取文档内容
   */
  async extractFromBytes(fileData, filename) {
    if (!this.isSupportedFile(filename)) {
      throw new Error(`不支持的文件格式: ${path.extname(filename)}`);
    }

    console.log(`开始提取文档: ${filename}`);

    try {
      const formData = new FormData();
      formData.append('file', fileData, filename);

      const response = await axios.post(this.extractUrl, formData, {
        headers: formData.getHeaders(),
        timeout: this.timeout
      });

      if (response.status === 200) {
        const result = ExtractedDocument.fromApiResponse(response.data);
        console.log(`文档提取成功: ${result.totalElements} 个元素`);
        return result;
      } else {
        throw new Error(`文档提取失败: ${response.status}, ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`文档提取超时 (${this.timeout / 1000}秒)`);
      }
      console.error(`文档提取失败: ${filename}, ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取支持的文件格式列表
   */
  getSupportedFormats() {
    return Array.from(this.supportedExtensions).sort();
  }

  /**
   * 估算处理时间（秒）
   */
  estimateProcessingTime(fileSizeMB) {
    // 基于文件大小的简单估算
    if (fileSizeMB < 1) {
      return 5;
    } else if (fileSizeMB < 5) {
      return 15;
    } else if (fileSizeMB < 10) {
      return 30;
    } else {
      return 60;
    }
  }
}

// 全局文档提取服务实例
let documentExtractService = null;

/**
 * 获取文档提取服务实例（单例模式）
 */
function getDocumentExtractService() {
  if (!documentExtractService) {
    documentExtractService = new DocumentExtractService();
  }
  return documentExtractService;
}

/**
 * 便捷函数：从字节数据提取文档内容
 */
async function extractDocumentFromBytes(fileData, filename) {
  const service = getDocumentExtractService();
  const result = await service.extractFromBytes(fileData, filename);
  return result.fullText;
}

/**
 * 便捷函数：检查文件是否支持
 */
function isSupportedDocument(filename) {
  const service = getDocumentExtractService();
  return service.isSupportedFile(filename);
}

module.exports = {
  DocumentExtractService,
  ExtractedDocument,
  getDocumentExtractService,
  extractDocumentFromBytes,
  isSupportedDocument
};
