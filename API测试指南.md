# API 测试指南

## 🧪 测试市集 API 端点

### 方法 1: 使用 curl 命令（推荐）

#### 1. 测试健康检查
```bash
curl https://globepick-backend-production.up.railway.app/health
```

**预期结果：**
```json
{
  "status": "ok",
  "message": "GlobePick API 运行正常",
  "mongodb": "connected",
  "timestamp": "2025-12-07T...",
  "uptime": 123.45
}
```

#### 2. 测试商品列表 API
```bash
curl https://globepick-backend-production.up.railway.app/api/marketplace/items
```

**预期结果：**
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

#### 3. 测试搜索 API
```bash
curl 'https://globepick-backend-production.up.railway.app/api/marketplace/items/search?q=iPhone'
```

**预期结果：**
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

#### 4. 测试带参数的查询
```bash
# 获取第一页，每页10条，按价格升序
curl 'https://globepick-backend-production.up.railway.app/api/marketplace/items?page=1&limit=10&sort=price&order=asc'

# 按分类筛选
curl 'https://globepick-backend-production.up.railway.app/api/marketplace/items?category=electronics'

# 按价格范围筛选
curl 'https://globepick-backend-production.up.railway.app/api/marketplace/items?minPrice=100&maxPrice=1000'
```

### 方法 2: 使用浏览器

直接在浏览器地址栏输入以下 URL：

1. **健康检查：**
   ```
   https://globepick-backend-production.up.railway.app/health
   ```

2. **商品列表：**
   ```
   https://globepick-backend-production.up.railway.app/api/marketplace/items
   ```

3. **搜索商品：**
   ```
   https://globepick-backend-production.up.railway.app/api/marketplace/items/search?q=iPhone
   ```

### 方法 3: 使用 Postman

1. 下载 Postman: https://www.postman.com/downloads/
2. 创建新请求
3. 选择 GET 方法
4. 输入 URL: `https://globepick-backend-production.up.railway.app/api/marketplace/items`
5. 点击 Send
6. 查看响应结果

### 方法 4: 使用浏览器开发者工具

1. 打开浏览器（Chrome/Safari）
2. 按 `F12` 或 `Cmd+Option+I` 打开开发者工具
3. 切换到 **Network** 标签
4. 在地址栏输入 API URL
5. 查看响应结果

### 📋 测试清单

#### 基础测试
- [ ] 健康检查端点返回 200
- [ ] 商品列表端点返回 JSON
- [ ] 搜索端点返回 JSON
- [ ] 所有端点响应时间 < 2秒

#### 功能测试
- [ ] 分页功能正常
- [ ] 筛选功能正常
- [ ] 排序功能正常
- [ ] 搜索功能正常

#### 错误处理测试
- [ ] 无效的 ID 返回 404
- [ ] 无效的参数返回 400
- [ ] 未授权请求返回 401

### 🔍 测试需要认证的端点

对于需要登录的端点（如创建商品、创建订单），需要先获取 token：

```bash
# 1. 登录获取 token
curl -X POST https://globepick-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# 2. 使用 token 访问受保护的端点
curl -X POST https://globepick-backend-production.up.railway.app/api/marketplace/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "测试商品",
    "description": "这是一个测试商品",
    "price": 100,
    "category": "electronics",
    "condition": "new"
  }'
```

### ✅ 成功标准

- ✅ 返回 HTTP 200 状态码
- ✅ 返回有效的 JSON 数据
- ✅ 响应时间 < 2秒
- ✅ 没有错误信息

### ❌ 常见问题

**问题：返回 "Cannot GET"**
- 检查 URL 是否正确
- 确认路由已部署
- 等待 Railway 完成部署（1-3分钟）

**问题：返回 500 错误**
- 检查 Railway 部署日志
- 确认 MongoDB 连接正常
- 检查环境变量配置

**问题：返回空数组**
- 这是正常的，说明数据库中没有数据
- 可以创建测试数据来验证

### 📞 需要帮助？

如果遇到问题：
1. 检查 Railway 部署日志
2. 确认 MongoDB 连接正常
3. 验证环境变量配置
4. 查看服务器控制台输出

