#!/bin/bash

# 重启后端服务器脚本

echo "🔍 检查端口占用..."

# 查找占用3000端口的进程
PID=$(lsof -ti:3000)

if [ ! -z "$PID" ]; then
    echo "⚠️  发现进程 $PID 占用3000端口，正在停止..."
    kill -9 $PID 2>/dev/null
    sleep 1
    echo "✅ 端口已释放"
else
    echo "✅ 3000端口未被占用"
fi

# 查找所有nodemon进程
NODEMON_PIDS=$(ps aux | grep "nodemon" | grep -v grep | awk '{print $2}')

if [ ! -z "$NODEMON_PIDS" ]; then
    echo "⚠️  发现nodemon进程，正在停止..."
    echo "$NODEMON_PIDS" | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ nodemon进程已停止"
fi

echo ""
echo "🚀 启动后端服务器..."
cd "$(dirname "$0")"
npm run dev




