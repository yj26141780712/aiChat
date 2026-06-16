# Docker 部署方案

## 架构概览

```
用户浏览器 --> Nginx:80 (前端静态 + 反向代理)
                  |
                  +--> /api/* , /auth/* , /socket.io/*  --> backend:3000
                  +--> 其他请求                         --> Angular SPA 静态文件
                  
backend:3000 --> mysql:3306 (容器内部网络)
```

三个容器：
- **mysql**: MySQL 8.0，持久化数据卷
- **backend**: NestJS 生产构建（Node 20），端口 3000（仅内部访问）
- **frontend**: Nginx 提供 Angular 静态文件 + 反向代理，端口 80（对外暴露）

## Task 1: 前端 API 地址可配置化

Angular 项目当前 5 个 service 中硬编码了 `http://localhost:3000`，需改为 environment 配置。

1. 新建 `chat-frontend/src/environments/environment.ts`（开发环境）：
```typescript
export const environment = { production: false, apiBase: 'http://localhost:3000' };
```

2. 新建 `chat-frontend/src/environments/environment.prod.ts`（生产环境）：
```typescript
export const environment = { production: true, apiBase: '' };
```
生产环境 `apiBase` 为空，因为 Nginx 反向代理同源，直接用相对路径。

3. 修改 `angular.json`，在 production 配置中添加 fileReplacements：
```json
"fileReplacements": [{
  "replace": "src/environments/environment.ts",
  "with": "src/environments/environment.prod.ts"
}]
```

4. 修改 5 个 service 文件，将硬编码的 `http://localhost:3000` 替换为 `environment.apiBase`：
   - `auth.service.ts`: `private baseUrl = \`${environment.apiBase}/auth\`;`
   - `socket.service.ts`: `io(environment.apiBase || window.location.origin, ...)`
   - `http.service.ts`: `private baseUrl = \`${environment.apiBase}/api/history\`;`
   - `wiki.service.ts`: `private baseUrl = \`${environment.apiBase}/api/wiki\`;`
   - `knowledge.service.ts`: `private baseUrl = \`${environment.apiBase}/api/knowledge\`;`

## Task 2: 后端适配容器化

1. 修改 `chat-backend/src/main.ts`：
   - 监听端口改为 `process.env.PORT || 3000`
   - CORS 配置支持环境变量 `CORS_ORIGIN`

2. 新建 `chat-backend/.env.docker`（Docker 环境变量）：
```env
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-strong-password
DB_DATABASE=chat_app

JWT_SECRET=production-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=production-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=eliga18857495193@163.com
SMTP_PASS=MTdtiqmFitETJZPJ

FRONTEND_URL=http://your-server-ip
CORS_ORIGIN=http://your-server-ip
PORT=3000
DASHSCOPE_API_KEY=sk-25f7a2ba21d646eb8fb51edd26eecb50
```

## Task 3: 创建 Docker 文件

### 3.1 后端 Dockerfile (`chat-backend/Dockerfile`)

多阶段构建：
- Stage 1: 安装依赖 + 编译 TypeScript
- Stage 2: 仅复制 dist + node_modules(production) 到精简 Node 20 镜像

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 3.2 前端 Dockerfile (`chat-frontend/Dockerfile`)

多阶段构建：
- Stage 1: 安装依赖 + ng build production
- Stage 2: Nginx 提供静态文件

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/chat-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 3.3 Nginx 配置 (`chat-frontend/nginx.conf`)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # API 和 Auth 代理到后端
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 20M;
    }

    location /auth/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket (socket.io) 代理
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Angular SPA - 所有前端路由都 fallback 到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Task 4: Docker Compose 编排

新建 `docker-compose.yml`（项目根目录 `d:\Python\studyDemo\`）：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: your-strong-password
      MYSQL_DATABASE: chat_app
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./chat-backend
    restart: always
    env_file: ./chat-backend/.env.docker
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - app-net

  frontend:
    build: ./chat-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-net

volumes:
  mysql_data:
  uploads_data:

networks:
  app-net:
    driver: bridge
```

## Task 5: .dockerignore 文件

分别为前后端创建 `.dockerignore` 排除 node_modules、dist 等：
```
node_modules
dist
.env
uploads
```

## Task 6: 部署说明

服务器上执行：
```bash
# 1. 将项目代码传到服务器（git clone 或 scp）

# 2. 修改 .env.docker 中的实际 IP/域名和密钥

# 3. 构建并启动
docker compose up -d --build

# 4. 查看日志
docker compose logs -f

# 5. 数据库初始化（首次，TypeORM synchronize 会自动建表）
# 如需导入旧数据：
docker compose exec mysql mysql -uroot -p chat_app < backup.sql
```

访问 `http://your-server-ip` 即可使用。

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `chat-frontend/src/environments/environment.ts` |
| 新建 | `chat-frontend/src/environments/environment.prod.ts` |
| 修改 | `chat-frontend/angular.json`（添加 fileReplacements） |
| 修改 | `chat-frontend/src/app/services/auth.service.ts` |
| 修改 | `chat-frontend/src/app/services/socket.service.ts` |
| 修改 | `chat-frontend/src/app/services/http.service.ts` |
| 修改 | `chat-frontend/src/app/services/wiki.service.ts` |
| 修改 | `chat-frontend/src/app/services/knowledge.service.ts` |
| 修改 | `chat-backend/src/main.ts` |
| 新建 | `chat-backend/.env.docker` |
| 新建 | `chat-backend/Dockerfile` |
| 新建 | `chat-backend/.dockerignore` |
| 新建 | `chat-frontend/Dockerfile` |
| 新建 | `chat-frontend/nginx.conf` |
| 新建 | `chat-frontend/.dockerignore` |
| 新建 | `docker-compose.yml` |
