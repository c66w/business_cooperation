"""
OSS存储服务
"""

import os
import time
import oss2
from typing import Tuple, Dict, Any
from loguru import logger
from config.settings import OSS_CONFIG

class OSSService:
    """OSS存储服务类"""
    
    def __init__(self):
        """初始化OSS客户端"""
        try:
            auth = oss2.Auth(
                OSS_CONFIG["access_key_id"],
                OSS_CONFIG["access_key_secret"]
            )
            self.bucket = oss2.Bucket(
                auth,
                OSS_CONFIG["endpoint"],
                OSS_CONFIG["bucket_name"]
            )
            logger.info("OSS客户端初始化成功")
        except Exception as e:
            logger.error(f"OSS客户端初始化失败: {e}")
            raise
    
    def generate_file_key(self, user_id: str, original_filename: str) -> str:
        """生成文件存储键"""
        timestamp = int(time.time())
        file_ext = os.path.splitext(original_filename)[1]
        prefix = OSS_CONFIG.get("prefix", "documents/")
        return f"{prefix}{user_id}/{timestamp}_{original_filename}"
    
    async def upload_file(self, file_content: bytes, file_key: str) -> Dict[str, Any]:
        """
        上传文件到OSS
        
        Args:
            file_content: 文件内容
            file_key: 文件存储键
            
        Returns:
            上传结果字典
        """
        try:
            # 上传文件
            result = self.bucket.put_object(file_key, file_content)
            
            if result.status == 200:
                file_url = f"{OSS_CONFIG['domain']}/{file_key}"
                logger.info(f"文件上传成功: {file_key}")
                
                return {
                    "success": True,
                    "oss_url": file_url,
                    "oss_key": file_key,
                    "file_size": len(file_content)
                }
            else:
                logger.error(f"文件上传失败，状态码: {result.status}")
                return {
                    "success": False,
                    "error": f"上传失败，状态码: {result.status}"
                }
                
        except Exception as e:
            logger.error(f"文件上传异常: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def download_file(self, file_key: str) -> Tuple[bool, bytes]:
        """
        从OSS下载文件
        
        Args:
            file_key: 文件存储键
            
        Returns:
            (成功标志, 文件内容)
        """
        try:
            result = self.bucket.get_object(file_key)
            content = result.read()
            logger.info(f"文件下载成功: {file_key}")
            return True, content
        except Exception as e:
            logger.error(f"文件下载失败: {e}")
            return False, b""
    
    async def download_file(self, oss_key: str) -> bytes:
        """
        从OSS下载文件

        Args:
            oss_key: OSS文件键

        Returns:
            文件内容字节
        """
        try:
            logger.info(f"开始从OSS下载文件: {oss_key}")
            result = self.bucket.get_object(oss_key)
            file_content = result.read()
            logger.info(f"OSS文件下载成功: {oss_key}, 大小: {len(file_content)} bytes")
            return file_content
        except Exception as e:
            logger.error(f"OSS文件下载失败: {oss_key}, 错误: {e}")
            return None

    async def delete_file(self, file_key: str) -> bool:
        """
        删除OSS文件

        Args:
            file_key: 文件存储键

        Returns:
            删除是否成功
        """
        try:
            self.bucket.delete_object(file_key)
            logger.info(f"文件删除成功: {file_key}")
            return True
        except Exception as e:
            logger.error(f"文件删除失败: {e}")
            return False
    
    async def get_file_info(self, file_key: str) -> Dict[str, Any]:
        """
        获取文件信息
        
        Args:
            file_key: 文件存储键
            
        Returns:
            文件信息字典
        """
        try:
            result = self.bucket.head_object(file_key)
            return {
                "exists": True,
                "size": result.content_length,
                "last_modified": result.last_modified,
                "content_type": result.content_type
            }
        except oss2.exceptions.NoSuchKey:
            return {"exists": False}
        except Exception as e:
            logger.error(f"获取文件信息失败: {e}")
            return {"exists": False, "error": str(e)}

# 创建全局OSS服务实例
oss_service = OSSService()
