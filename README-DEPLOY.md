# 🚀 拾物 GlobePick 后端部署指南

## 📋 部署前准备

### 1. 服务器要求

- **操作系统**: Linux / macOS / Windows
- **Node.js**: v16+ (推荐 v18+)
- **MongoDB**: v5.0+ (本地或云服务)
- **内存**: 至少 512MB
- **磁盘**: 至少 1GB 可用空间

### 2. 获取服务器信息

在开始部署前，请准备以下信息：

- [ ] 服务器IP地址或域名
- [ ] MongoDB连接字符串
- [ ] JWT密钥（用于生成token）
- [ ] 域名（如果使用HTTPS）

---

## 🔧 配置步骤

### 步骤1: 配置环境变量

1. **复制配置模板**
   ```bash
   cd backend
   cp .env.production.example .env
   ```

2. **编辑 .env 文件**
   ```bash
   nano .env
   # 或使用其他编辑器
   ```

3. **填写配置信息**

   ```env
   # MongoDB 连接字符串
   # 选项1: 本地MongoDB
   MONGODB_URI=mongodb://localhost:27017/globepick
   
   # 选项2: MongoDB Atlas (推荐)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/globepick
   
   # JWT 密钥（必须更改！）
   # 生成方式: openssl rand -base64 32
   JWT_SECRET=your-strong-secret-key-here
   
   # 服务器端口
   PORT=3000
   
   # CORS 允许的源
   CORS_ORIGIN=*
   
   # 生产环境域名
   API_DOMAIN=https://api.yourdomain.com
   
   # NODE_ENV
   NODE_ENV=production
   ```

### 步骤2: 安装依赖

```bash
cd backend
npm install
```

### 步骤3: 测试MongoDB连接

```bash
node test-mongodb-connection.js
```

如果连接成功，会显示：
```
✅ MongoDB 连接成功
```

---

## 🚀 部署方式

### 方式1: 使用部署脚本（推荐）

```bash
chmod +x deploy.sh
./deploy.sh
```

### 方式2: 使用 PM2（推荐用于生产环境）

1. **安装 PM2**
   ```bash
   npm install -g pm2
   ```

2. **启动服务器**
   ```bash
   pm2 start server.js --name globepick-backend
   pm2 save
   ```

3. **常用命令**
   ```bash
   pm2 logs globepick-backend    # 查看日志
   pm2 restart globepick-backend # 重启
   pm2 stop globepick-backend    # 停止
   pm2 delete globepick-backend  # 删除
   ```

### 方式3: 使用 nohup（简单方式）

```bash
nohup node server.js > server.log 2>&1 &
```

---

## 🌐 配置反向代理（可选，推荐）

### 使用 Nginx

1. **安装 Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **配置 Nginx**
   
   创建配置文件 `/etc/nginx/sites-available/globepick-api`:
   
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **启用配置**
   ```bash
   sudo ln -s /etc/nginx/sites-available/globepick-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **配置 HTTPS（推荐）**
   
   使用 Let's Encrypt:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## 📱 配置 iOS 应用

### 更新生产环境 API 地址

1. **编辑 `MongoDBService.swift`**
   
   ```swift
   #else
   baseURL = "https://api.yourdomain.com/api" // 替换为实际地址
   #endif
   ```

2. **编辑 `AppConfig.swift`**
   
   ```swift
   #else
   static let baseURL = "https://api.yourdomain.com/api" // 替换为实际地址
   #endif
   ```

3. **更新 Info.plist（如果需要）**
   
   如果使用HTTP，需要在 `Info.plist` 中添加域名到 `NSExceptionDomains`

---

## ✅ 验证部署

### 1. 检查服务器状态

```bash
curl http://localhost:3000/api/notes
```

应该返回 JSON 数据。

### 2. 检查外部访问

在浏览器中访问：
```
http://your-server-ip:3000/api/notes
```

### 3. 检查日志

```bash
# 如果使用 PM2
pm2 logs globepick-backend

# 如果使用 nohup
tail -f server.log
```

---

## 🔒 安全建议

1. **更改 JWT_SECRET**
   - 使用强密码
   - 生成方式: `openssl rand -base64 32`

2. **限制 CORS_ORIGIN**
   - 生产环境不要使用 `*`
   - 只允许实际的前端域名

3. **使用 HTTPS**
   - 配置 SSL 证书
   - 使用 Let's Encrypt（免费）

4. **防火墙配置**
   - 只开放必要端口（80, 443, 3000）
   - 限制 MongoDB 端口访问

5. **定期备份**
   - 定期备份 MongoDB 数据
   - 使用 `mongodump` 命令

---

## 🐛 故障排除

### 问题1: 端口被占用

```bash
# 查找占用端口的进程
lsof -ti:3000

# 杀死进程
kill -9 $(lsof -ti:3000)
```

### 问题2: MongoDB 连接失败

1. 检查 MongoDB 是否运行
   ```bash
   # Linux
   sudo systemctl status mongod
   
   # macOS
   brew services list | grep mongodb
   ```

2. 检查连接字符串是否正确

3. 检查防火墙设置

### 问题3: 无法外部访问

1. 检查防火墙
   ```bash
   # Ubuntu
   sudo ufw allow 3000
   ```

2. 检查服务器安全组（云服务器）

3. 检查 Nginx 配置（如果使用）

---

## 📞 支持

如有问题，请检查：
- 服务器日志
- MongoDB 连接状态
- 网络配置
- 防火墙设置

---

**🎉 部署完成后，记得更新 iOS 应用中的生产环境 API 地址！**

