# 🌍 GlobePick 后端 API

## 📋 项目说明

拾物 GlobePick 应用的后端 API，使用 Node.js + Express + MongoDB 构建。

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 3. 启动 MongoDB

**选项 A：使用 MongoDB Atlas（推荐，免费）**
- 访问 https://www.mongodb.com/cloud/atlas
- 创建免费集群
- 获取连接字符串
- 填入 `.env` 文件的 `MONGODB_URI`

**选项 B：本地 MongoDB**
- 安装 MongoDB
- 启动 MongoDB 服务
- 使用默认连接：`mongodb://localhost:27017/globepick`

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

---

## 📁 项目结构

```
backend/
├── server.js              # 主服务器文件
├── models/                # 数据模型
│   ├── User.js
│   ├── Note.js
│   ├── Comment.js
│   └── ...
├── routes/                # API 路由
│   ├── auth.js
│   ├── users.js
│   ├── notes.js
│   └── ...
├── controllers/           # 控制器
│   ├── authController.js
│   ├── userController.js
│   └── ...
├── middleware/            # 中间件
│   ├── auth.js           # JWT 认证
│   └── ...
├── config/               # 配置文件
│   └── db.js
└── .env                 # 环境变量
```

---

## 🔐 API 认证

所有需要认证的 API 都需要在请求头中包含：

```
Authorization: Bearer <token>
```

---

## 📝 API 文档

### 认证相关

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 用户相关

- `GET /api/users/:id` - 获取用户信息
- `PUT /api/users/:id` - 更新用户信息

### 笔记相关

- `GET /api/notes` - 获取笔记列表
- `POST /api/notes` - 创建笔记
- `GET /api/notes/:id` - 获取笔记详情
- `DELETE /api/notes/:id` - 删除笔记

### 其他 API

详见各路由文件。

---

## 🧪 测试

```bash
# 使用 curl 测试
curl http://localhost:3000/health
```

---

## 📦 依赖说明

- **express** - Web 框架
- **mongoose** - MongoDB ODM
- **bcryptjs** - 密码加密
- **jsonwebtoken** - JWT 认证
- **cors** - 跨域支持
- **multer** - 文件上传
- **socket.io** - WebSocket 实时通信

---

## 🆘 常见问题

### MongoDB 连接失败

- 检查 MongoDB 是否运行
- 检查连接字符串是否正确
- 检查网络连接

### 端口被占用

- 修改 `.env` 文件中的 `PORT`
- 或使用其他端口

---

**更多文档请查看各文件中的注释！**




