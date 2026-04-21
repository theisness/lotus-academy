# 部署配置说明

## 概述

所有部署脚本现在使用统一的配置文件 `script/deploy.env`，避免在多个脚本中硬编码 IP、端口等信息。

## 配置文件

### deploy.env

包含所有部署相关的配置：

- **SSH 连接信息**: 服务器地址、端口
- **远程路径**: 应用部署目录
- **域名**: 网站域名
- **端口**: 各服务的端口号

### 首次使用

1. 复制示例配置：
   ```powershell
   Copy-Item script/deploy.env.example script/deploy.env
   ```

2. 编辑 `script/deploy.env`，填入你的配置：
   ```bash
   # SSH Connection
   SSH_HOST=root@your-server-ip
   SSH_PORT=22
   
   # Remote Paths
   REMOTE_DIR=/opt/lotus-academy
   REMOTE_APP_DIR=/opt/lotus-academy/frontend-app
   
   # Domain
   DOMAIN=your-domain.com
   
   # SSL/Email
   SSL_EMAIL=admin@your-domain.com
   
   # Service Ports (on remote server)
   FRONTEND_PORT=8080
   BACKEND_KONG_PORT=8003
   STUDIO_PORT=3002
   ```

3. **重要**: `deploy.env` 已添加到 `.gitignore`，不会被提交到 Git

## 更新后的脚本

所有部署脚本现在会自动读取 `deploy.env`：

### 1. backend_online.ps1
- 上传后端文件和 Docker 配置
- 启动后端服务

### 2. frontend_online.ps1
- 本地构建前端
- 上传到服务器
- 配置 systemd 服务

### 3. nginx_deploy.ps1
- 安装和配置 Nginx
- 使用 `deploy.env` 中的域名和端口

### 4. ssl_deploy.ps1
- 配置 SSL 证书
- 使用 `deploy.env` 中的域名和邮箱

## 使用方法

### 完整部署流程

```powershell
# 1. 生成环境变量
.\script\generate_env.ps1

# 2. 部署 Nginx
.\script\nginx_deploy.ps1

# 3. 部署后端
.\script\backend_online.ps1

# 4. 部署前端
.\script\frontend_online.ps1

# 5. 配置 SSL（可选，需要 HTTP 先工作）
.\script\ssl_deploy.ps1
```

### 单独更新某个组件

```powershell
# 只更新后端
.\script\backend_online.ps1

# 只更新前端
.\script\frontend_online.ps1
```

## 配置项说明

### SSH_HOST
服务器 SSH 连接地址，格式：`user@ip` 或 `user@domain`

**示例**:
- `admin@academy.ssbx.site`

### SSH_PORT
SSH 端口号

**默认**: `22`  
**示例**: `60000`

### REMOTE_DIR
应用在服务器上的根目录

**默认**: `/opt/lotus-academy`  
**说明**: 所有文件（backend、docker、script）都会上传到这个目录

### REMOTE_APP_DIR
前端应用的部署目录

**默认**: `/opt/lotus-academy/frontend-app`  
**说明**: Next.js standalone 构建输出的位置

### DOMAIN
网站域名

**示例**: `academy.ssbx.site`  
**说明**: 用于 Nginx 配置和 SSL 证书申请

### SSL_EMAIL
SSL 证书到期通知邮箱

**示例**: `admin@academy.ssbx.site`  
**说明**: Let's Encrypt 会在证书即将到期时发送邮件

### FRONTEND_PORT
前端服务监听端口（服务器本地）

**默认**: `8080`  
**说明**: Next.js 服务器监听的端口，Nginx 会反向代理到这个端口

### BACKEND_KONG_PORT
Kong API 网关端口（服务器本地）

**默认**: `8003`  
**说明**: Supabase Kong 网关的端口，Nginx 会将 `/api/*` 代理到这里

### STUDIO_PORT
Supabase Studio 管理面板端口

**默认**: `3002`  
**说明**: 数据库管理界面的端口

## 安全注意事项

1. **不要提交 deploy.env 到 Git**
   - 已添加到 `.gitignore`
   - 包含敏感的服务器信息

2. **保护 SSH 密钥**
   - 确保 SSH 私钥权限正确（`chmod 600`）
   - 不要在脚本中硬编码密码

3. **使用 SSH 密钥认证**
   - 推荐使用密钥而非密码
   - 配置方法：
     ```powershell
     # 生成密钥（如果没有）
     ssh-keygen -t ed25519
     
     # 复制公钥到服务器
     ```

## 故障排查

### 错误: "deploy.env not found"

**原因**: 未创建配置文件

**解决**:
```powershell
Copy-Item script/deploy.env.example script/deploy.env
# 然后编辑 deploy.env
```

### 错误: SSH 连接失败

**检查**:
1. 服务器 IP 和端口是否正确
2. SSH 密钥是否配置
3. 防火墙是否开放端口

### 错误: 端口已被占用

**检查服务器端口**:
```bash
# 在服务器上运行
netstat -tlnp | grep -E '8080|8003|3002'
```

**修改端口**:
编辑 `deploy.env`，更改相应的端口号

## 迁移到新服务器

1. 复制 `deploy.env.example` 为 `deploy.env`
2. 更新 `SSH_HOST` 和 `SSH_PORT`
3. 如果目录结构不同，更新 `REMOTE_DIR`
4. 运行完整部署流程

## 多环境支持

如果需要支持多个环境（开发、测试、生产），可以创建多个配置文件：

```
script/
  deploy.env.dev
  deploy.env.staging
  deploy.env.prod
```

然后在运行脚本前设置环境变量：

```powershell
# 使用开发环境
$env:DEPLOY_ENV = "dev"
.\script\backend_online.ps1

# 使用生产环境
$env:DEPLOY_ENV = "prod"
.\script\backend_online.ps1
```

（需要修改脚本以支持此功能）

## 相关文件

- `script/deploy.env.example` - 配置模板
- `script/deploy.env` - 实际配置（不提交到 Git）
- `script/backend_online.ps1` - 后端部署脚本
- `script/frontend_online.ps1` - 前端部署脚本
- `script/nginx_deploy.ps1` - Nginx 部署脚本
- `script/ssl_deploy.ps1` - SSL 配置脚本
- `.gitignore` - Git 忽略规则
