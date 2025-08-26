"""
服务模块
"""

from .oss_service import OSSService

# 创建全局实例
oss_service = OSSService()

__all__ = ['oss_service', 'OSSService']
