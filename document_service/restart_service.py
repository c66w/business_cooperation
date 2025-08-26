#!/usr/bin/env python3
"""
重启文档服务脚本
"""

import os
import signal
import subprocess
import time
import requests

def kill_existing_service():
    """杀掉现有的服务进程"""
    try:
        # 查找占用8000端口的进程
        result = subprocess.run(['lsof', '-ti:8000'], capture_output=True, text=True)
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid:
                    print(f"🔪 杀掉进程 {pid}")
                    os.kill(int(pid), signal.SIGTERM)
                    time.sleep(1)
                    # 如果进程还在，强制杀掉
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                    except ProcessLookupError:
                        pass
        print("✅ 清理完成")
    except Exception as e:
        print(f"⚠️ 清理进程时出错: {e}")

def start_service():
    """启动服务"""
    print("🚀 启动文档服务...")
    
    # 启动服务
    process = subprocess.Popen(
        ['python', 'start_service.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1
    )
    
    # 等待服务启动
    print("⏳ 等待服务启动...")
    for i in range(30):  # 最多等待30秒
        try:
            response = requests.get('http://localhost:8000/health', timeout=2)
            if response.status_code == 200:
                print("✅ 服务启动成功!")
                print("📍 服务地址: http://localhost:8000")
                print("📖 API文档: http://localhost:8000/docs")
                return process
        except:
            pass
        
        time.sleep(1)
        print(f"⏳ 等待中... ({i+1}/30)")
    
    print("❌ 服务启动超时")
    process.terminate()
    return None

def main():
    print("🔄 重启文档处理服务")
    print("="*50)
    
    # 1. 杀掉现有服务
    kill_existing_service()
    
    # 2. 启动新服务
    process = start_service()
    
    if process:
        print("\n🎉 服务重启成功!")
        print("现在可以运行测试脚本:")
        print("  python test_debug_output.py")
        print("\n按 Ctrl+C 停止服务")
        
        try:
            # 实时显示服务输出
            for line in process.stdout:
                print(line.rstrip())
        except KeyboardInterrupt:
            print("\n🛑 停止服务...")
            process.terminate()
            process.wait()
            print("✅ 服务已停止")
    else:
        print("❌ 服务启动失败")

if __name__ == "__main__":
    main()
