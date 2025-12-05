#!/bin/bash

# 切换到 backend 目录
cd "$(dirname "$0")"

echo "📂 当前目录: $(pwd)"
echo ""

# 检查 package.json
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 找不到 package.json 文件"
    exit 1
fi

echo "✅ package.json 文件存在"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，正在创建..."
    cp env-template.txt .env
    echo "✅ .env 文件已创建，请编辑并填入 MongoDB 密码"
fi

echo "📦 开始安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 依赖安装成功！"
    echo ""
    echo "🚀 启动服务器..."
    echo ""
    npm run dev
else
    echo ""
    echo "❌ 依赖安装失败，请检查错误信息"
    exit 1
fi




