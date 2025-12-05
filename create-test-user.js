// 创建测试用户脚本
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/globepick';

async function createTestUser() {
  try {
    // 连接 MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    // 测试账号信息
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: '123456'
    };

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email: testUser.email }, { username: testUser.username }]
    });

    if (existingUser) {
      console.log('⚠️  测试账号已存在:');
      console.log(`   用户名: ${testUser.username}`);
      console.log(`   邮箱: ${testUser.email}`);
      console.log(`   密码: ${testUser.password}`);
      console.log(`   ID: ${existingUser._id}`);
      
      // 如果密码不同，更新密码
      if (!(await existingUser.comparePassword(testUser.password))) {
        existingUser.password = testUser.password;
        await existingUser.save();
        console.log('✅ 已更新密码');
      }
    } else {
      // 创建新用户
      const user = new User(testUser);
      await user.save();
      console.log('✅ 测试账号创建成功:');
      console.log(`   用户名: ${testUser.username}`);
      console.log(`   邮箱: ${testUser.email}`);
      console.log(`   密码: ${testUser.password}`);
      console.log(`   ID: ${user._id}`);
    }

    // 创建第二个测试账号
    const testUser2 = {
      username: 'demo',
      email: 'demo@example.com',
      password: '123456'
    };

    const existingUser2 = await User.findOne({
      $or: [{ email: testUser2.email }, { username: testUser2.username }]
    });

    if (existingUser2) {
      console.log('⚠️  测试账号 2 已存在:');
      console.log(`   用户名: ${testUser2.username}`);
      console.log(`   邮箱: ${testUser2.email}`);
      console.log(`   密码: ${testUser2.password}`);
    } else {
      const user2 = new User(testUser2);
      await user2.save();
      console.log('✅ 测试账号 2 创建成功:');
      console.log(`   用户名: ${testUser2.username}`);
      console.log(`   邮箱: ${testUser2.email}`);
      console.log(`   密码: ${testUser2.password}`);
    }

    console.log('\n📝 你可以使用以下账号登录:');
    console.log('   账号 1: test@example.com / 123456');
    console.log('   账号 2: demo@example.com / 123456');

    await mongoose.disconnect();
    console.log('\n✅ 完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createTestUser();




