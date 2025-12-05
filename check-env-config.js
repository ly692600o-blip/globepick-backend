// 检查 .env 文件配置的工具
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('📋 检查 .env 文件配置');
console.log('====================');
console.log('');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.error('❌ 错误: .env 文件不存在');
    process.exit(1);
}

console.log('✅ .env 文件存在');
console.log('');

const envContent = fs.readFileSync(envPath, 'utf8');
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
    console.error('❌ 错误: .env 文件中没有 MONGODB_URI');
    process.exit(1);
}

console.log('📝 MongoDB 连接字符串检查:');
console.log('');

// 解析连接字符串
const uriMatch = mongodbUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);

if (!uriMatch) {
    console.error('❌ 连接字符串格式错误');
    console.error('正确格式: mongodb+srv://用户名:密码@cluster0.xxx.mongodb.net/globepick?retryWrites=true&w=majority');
    process.exit(1);
}

const [, username, password, host, database] = uriMatch;

console.log('   用户名:', username);
console.log('   密码:', password.length > 0 ? '**** (' + password.length + ' 字符)' : '❌ 密码为空！');
console.log('   主机:', host);
console.log('   数据库:', database);
console.log('');

// 检查是否有占位符
if (password.includes('<') || password.includes('>')) {
    console.error('❌ 错误: 密码中还有占位符（如 <db_password>）');
    console.error('   请将 <db_password> 替换为实际的 MongoDB Atlas 密码');
    console.error('');
    process.exit(1);
}

if (password.length === 0) {
    console.error('❌ 错误: 密码为空');
    console.error('   请在连接字符串中设置密码');
    console.error('');
    process.exit(1);
}

// 检查数据库名
if (database !== 'globepick') {
    console.warn('⚠️  警告: 数据库名不是 "globepick"');
    console.warn('   当前数据库名:', database);
    console.warn('   建议修改为: globepick');
    console.log('');
}

// 检查是否有特殊字符但没有编码
const specialChars = ['@', '#', '/', ':', '%', '&', '=', '?'];
const hasUnencodedSpecial = specialChars.some(char => password.includes(char));

if (hasUnencodedSpecial) {
    console.warn('⚠️  警告: 密码中包含特殊字符，可能需要 URL 编码');
    console.warn('   如果连接失败，请对特殊字符进行 URL 编码：');
    console.warn('   @ → %40, # → %23, / → %2F, : → %3A');
    console.warn('   或者设置一个只包含字母和数字的简单密码');
    console.log('');
}

console.log('📋 连接字符串格式: ✅');
console.log('');

// 尝试连接测试
console.log('🔍 测试 MongoDB 连接...');
console.log('');

const mongoose = require('mongoose');

mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 15000
})
.then(() => {
    console.log('✅✅✅ MongoDB 连接成功！✅✅✅');
    console.log('');
    console.log('✅ 配置正确！下一步：');
    console.log('   1. 重启后端服务器');
    console.log('   2. 创建测试账号: node create-test-user.js');
    console.log('   3. 在 iOS 应用中测试登录');
    mongoose.disconnect();
    process.exit(0);
})
.catch((err) => {
    console.error('❌ MongoDB 连接失败');
    console.error('');
    console.error('错误:', err.message);
    console.error('错误代码:', err.code || 'N/A');
    console.error('');
    
    if (err.message.includes('bad auth') || err.code === 8000) {
        console.error('🔴 问题：用户名或密码错误');
        console.error('');
        console.error('解决方案：');
        console.error('   1. 登录 MongoDB Atlas: https://cloud.mongodb.com/');
        console.error('   2. Database Access → 检查用户名和密码');
        console.error('   3. 如果密码不对，重置密码或更新 .env 文件');
        console.error('   4. 确保密码中没有占位符（如 <db_password>）');
    }
    
    process.exit(1);
});




