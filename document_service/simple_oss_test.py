#!/usr/bin/env python3
"""
简单的OSS连接测试
"""

import oss2

def test_oss():
    """测试OSS连接"""
    try:
        # 使用配置（请在实际使用时设置正确的值）
        access_key_id = 'your_access_key_id_here'
        access_key_secret = 'your_access_key_secret_here'
        endpoint = 'oss-cn-hangzhou.aliyuncs.com'
        bucket_name = 'your_bucket_name'
        
        print("🔍 测试OSS连接...")
        print(f"📋 配置信息:")
        print(f"   - Endpoint: {endpoint}")
        print(f"   - Bucket: {bucket_name}")
        print(f"   - Access Key ID: {access_key_id[:8]}...")
        
        # 创建授权对象
        auth = oss2.Auth(access_key_id, access_key_secret)
        
        # 创建Bucket对象
        bucket = oss2.Bucket(auth, endpoint, bucket_name)
        
        # 测试上传一个小文件
        test_content = b"Hello OSS! This is a test file from business cooperation system."
        test_key = "documents/business-cooperation/test/connection_test.txt"
        
        print(f"\n📤 测试上传文件: {test_key}")
        result = bucket.put_object(test_key, test_content)
        
        if result.status == 200:
            print(f"✅ 上传成功!")
            oss_url = f"https://{bucket_name}.{endpoint}/{test_key}"
            print(f"   - OSS URL: {oss_url}")
            print(f"   - File Size: {len(test_content)} bytes")
            
            # 测试下载
            print(f"\n📥 测试下载文件: {test_key}")
            download_result = bucket.get_object(test_key)
            downloaded_content = download_result.read()
            
            if downloaded_content == test_content:
                print(f"✅ 下载成功!")
                print(f"   - Content: {downloaded_content.decode('utf-8')}")
                
                # 测试删除
                print(f"\n🗑️ 测试删除文件: {test_key}")
                bucket.delete_object(test_key)
                print(f"✅ 删除成功!")
                
                return True
            else:
                print(f"❌ 下载内容不匹配!")
                return False
        else:
            print(f"❌ 上传失败，状态码: {result.status}")
            return False
            
    except Exception as e:
        print(f"❌ OSS测试失败: {e}")
        return False

if __name__ == "__main__":
    print("🚀 开始OSS功能测试")
    print("=" * 50)
    
    success = test_oss()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 OSS功能测试完成!")
        print("✅ 所有功能正常工作")
    else:
        print("❌ OSS功能测试失败!")
        print("请检查OSS配置和网络连接")
