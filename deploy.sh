#!/bin/bash

# 拾物 GlobePick 后端部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始部署拾物 GlobePick 后端服务器..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "📝 请先复制 env-template.txt 为 .env 并配置"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装 npm"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 检查 MongoDB 连接
echo "🔍 检查 MongoDB 连接..."
node test-mongodb-connection.js

if [ $? -ne 0 ]; then
    echo "⚠️  警告: MongoDB 连接测试失败，请检查配置"
    read -p "是否继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 停止旧进程（如果存在）
echo "🛑 停止旧进程..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 启动服务器
echo "✅ 启动服务器..."
if command -v pm2 &> /dev/null; then
    echo "📦 使用 PM2 启动（推荐）..."
    pm2 start server.js --name globepick-backend
    pm2 save
    echo "✅ 服务器已启动，使用 'pm2 logs globepick-backend' 查看日志"
else
    echo "📦 使用 node 启动..."
    nohup node server.js > server.log 2>&1 &
    echo "✅ 服务器已启动，日志文件: server.log"
fi

echo ""
echo "🎉 部署完成！"
echo "📝 服务器运行在: http://0.0.0.0:3000"
echo "📝 API 地址: http://$(hostname -I | awk '{print $1}'):3000/api"
echo ""
echo "💡 提示:"
echo "   - 查看日志: tail -f server.log"
echo "   - 停止服务器: pkill -f 'node server.js'"
echo "   - 使用 PM2: pm2 stop globepick-backend"
