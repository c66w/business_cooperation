#!/usr/bin/env python3
"""
OSS功能测试脚本
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.oss_service import oss_service
from config.settings import OSS_CONFIG

async def test_oss_connection():
    """测试OSS连接"""
    print("🔍 测试OSS连接...")
    print(f"📋 OSS配置:")
    print(f"   - Endpoint: {OSS_CONFIG['endpoint']}")
    print(f"   - Bucket: {OSS_CONFIG['bucket_name']}")
    print(f"   - Domain: {OSS_CONFIG['domain']}")
    print(f"   - Access Key ID: {OSS_CONFIG['access_key_id'][:8]}...")
    
    try:
        # 测试上传一个小文件
        test_content = b"Hello OSS! This is a test file."
        test_key = "test/connection_test.txt"
        
        print(f"\n📤 测试上传文件: {test_key}")
        upload_result = await oss_service.upload_file(test_content, test_key)
        
        if upload_result["success"]:
            print(f"✅ 上传成功!")
            print(f"   - OSS URL: {upload_result['oss_url']}")
            print(f"   - File Size: {upload_result['file_size']} bytes")
            
            # 测试下载
            print(f"\n📥 测试下载文件: {test_key}")
            download_success, content = await oss_service.download_file(test_key)
            
            if download_success:
                print(f"✅ 下载成功!")
                print(f"   - Content: {content.decode('utf-8')}")
                
                # 测试获取文件信息
                print(f"\n📋 测试获取文件信息: {test_key}")
                file_info = await oss_service.get_file_info(test_key)
                
                if file_info.get("exists"):
                    print(f"✅ 文件信息获取成功!")
                    print(f"   - Size: {file_info['size']} bytes")
                    print(f"   - Content Type: {file_info['content_type']}")
                    print(f"   - Last Modified: {file_info['last_modified']}")
                else:
                    print(f"❌ 文件信息获取失败: {file_info}")
                
                # 测试删除
                print(f"\n🗑️ 测试删除文件: {test_key}")
                delete_success = await oss_service.delete_file(test_key)
                
                if delete_success:
                    print(f"✅ 删除成功!")
                else:
                    print(f"❌ 删除失败!")
                    
            else:
                print(f"❌ 下载失败!")
                
        else:
            print(f"❌ 上传失败: {upload_result['error']}")
            
    except Exception as e:
        print(f"❌ OSS测试失败: {e}")
        return False
    
    return True

async def main():
    """主函数"""
    print("🚀 开始OSS功能测试")
    print("=" * 50)
    
    success = await test_oss_connection()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 OSS功能测试完成!")
        print("✅ 所有功能正常工作")
    else:
        print("❌ OSS功能测试失败!")
        print("请检查OSS配置和网络连接")

if __name__ == "__main__":
    asyncio.run(main())
