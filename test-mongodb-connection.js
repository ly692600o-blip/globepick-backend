// MongoDB 连接测试脚本
// 使用你从 MongoDB Atlas 获取的连接代码

const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// 从 .env 文件获取连接字符串，或者使用默认值
const uri = process.env.MONGODB_URI || "mongodb+srv://ly692600o_db_user:<db_password>@cluster0.hle5sck.mongodb.net/?appName=Cluster0";

console.log('🔍 测试 MongoDB 连接...');
console.log('连接字符串:', uri.replace(/:[^:@]+@/, ':****@'));
console.log('');

// 创建 MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('正在连接...');
    // 连接到服务器
    await client.connect();
    
    // 发送 ping 确认连接成功
    await client.db("admin").command({ ping: 1 });
    
    console.log('');
    console.log('✅✅✅ MongoDB 连接成功！✅✅✅');
    console.log('');
    console.log('下一步：');
    console.log('   1. 确保 .env 文件中的 MONGODB_URI 格式正确');
    console.log('   2. 重启后端服务器');
    console.log('   3. 创建测试账号');
    
  } catch (error) {
    console.error('');
    console.error('❌❌❌ MongoDB 连接失败 ❌❌❌');
    console.error('');
    console.error('错误:', error.message);
    console.error('错误代码:', error.code || 'N/A');
    console.error('');
    
    if (error.message.includes('bad auth') || error.code === 8000) {
      console.error('🔴 问题：用户名或密码错误');
      console.error('');
      console.error('请检查：');
      console.error('   1. .env 文件中的 MONGODB_URI 是否正确');
      console.error('   2. 密码是否已替换 <db_password>');
      console.error('   3. 连接字符串格式是否正确');
    } else if (error.message.includes('<db_password>')) {
      console.error('🔴 问题：连接字符串中还有 <db_password> 占位符');
      console.error('');
      console.error('请将 <db_password> 替换为实际的数据库密码');
    }
    
    process.exit(1);
  } finally {
    // 确保客户端关闭
    await client.close();
  }
}

run().catch(console.error);




