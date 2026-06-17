# AI 聊天图片上传功能

## 架构设计

- **图片上传**：前端通过 HTTP 上传图片 -> 后端存储到 `uploads/` 目录 -> 返回可访问 URL
- **消息传递**：WebSocket 消息增加 `images: string[]` 字段（图片 URL 数组）
- **模型自动切换**：消息含图片时用 `qwen-vl-max`（多模态），纯文本用 `qwen3.7-max`
- **OpenAI 兼容格式**：DashScope 的 `qwen-vl-max` 支持 OpenAI Chat Completions 多模态格式
- **AI 回复图片**：需要额外集成 `wanx`（通义万相）图像生成 API，作为后续扩展

## Task 1: Message 实体增加图片字段

文件: `chat-backend/src/chat/entities/message.entity.ts`

```ts
@Column({ type: 'simple-json', nullable: true })
images: string[] | null;  // 存储图片 URL 数组
```

## Task 2: 后端新增图片上传接口

新建文件: `chat-backend/src/chat/chat-upload.controller.ts`

- `POST /api/chat/upload` - 接收图片文件（multipart/form-data）
- 存储到 `uploads/chat/` 目录
- 返回 `{ url: '/uploads/chat/xxx.jpg' }`
- 使用 JwtAuthGuard 鉴权
- 限制文件大小 10MB，类型限 jpg/png/gif/webp

## Task 3: 修改 ChatService 支持多模态

文件: `chat-backend/src/chat/chat.service.ts`

- `ChatMessage.content` 类型扩展：支持 `string | Array<{type: 'text'|'image_url', ...}>`
- `streamChat` 方法增加 `hasImages` 参数
- `hasImages = true` 时使用模型 `qwen-vl-max`，`enable_thinking` 需关闭（VL 模型不支持）
- `hasImages = false` 时保持原逻辑 `qwen3.7-max`

```ts
// 多模态消息格式
content: [
  { type: 'text', text: '这是什么？' },
  { type: 'image_url', image_url: { url: 'http://server/uploads/chat/xxx.jpg' } }
]
```

## Task 4: 修改 ChatGateway 处理图片消息

文件: `chat-backend/src/chat/chat.gateway.ts`

- `UserMessagePayload` 增加 `images?: string[]` 字段
- 收到图片时，将用户消息构建为多模态格式（text + image_url）
- 图片 URL 需要拼为完整地址：`http://localhost:3000${imageUrl}`
- 调用 `historyService.saveMessage` 时传入 `images` 数组
- 根据是否有图片自动选择模型

## Task 5: 修改 HistoryService 支持图片存储

文件: `chat-backend/src/chat/history.service.ts`

- `saveMessage` 方法增加可选 `images` 参数
- `getMessages` 返回时包含 `images` 字段

## Task 6: Nginx 静态文件服务

文件: `chat-frontend/nginx.conf`

```nginx
location /uploads/ {
    proxy_pass http://backend:3000;
}
```

## Task 7: 后端静态文件服务

文件: `chat-backend/src/main.ts`

- 添加 `app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' })`

## Task 8: 前端上传 UI

文件: `chat-frontend/src/app/chat/chat.component.ts`

- 添加 `selectedImages: signal<File[]>([])` 存储待上传图片
- `sendMessage` 方法改造：先上传图片获取 URL，再通过 WebSocket 发送
- 添加 `onFileSelect` 处理文件选择
- 添加 `removeImage` 移除已选图片
- 添加图片预览逻辑

文件: `chat-frontend/src/app/chat/chat.component.html`

- 输入区域添加图片上传按钮（📎 图标）
- 显示已选图片预览缩略图 + 删除按钮
- 消息气泡中显示图片（用户消息和 AI 回复都需要渲染图片）

## Task 9: 前端样式

文件: `chat-frontend/src/app/chat/chat.component.css`

- 图片预览区域样式（横向排列、缩略图、删除按钮）
- 消息气泡中图片样式（可点击放大）
- 上传按钮样式

## 关于 AI 回复图片（后续扩展）

AI 回复生成图片需要集成**通义万相**（wanx）图像生成模型：
- 通过 DashScope 的 `wanx-v2` 或 `wanx2.1-t2i-turbo` 模型
- 需要单独的异步调用 -> 轮询结果 -> 下载图片 -> 存入 uploads
- 建议作为独立功能后续添加，不在本次范围内
