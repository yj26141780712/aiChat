# RAG 知识库检索增强生成

## 技术架构

- **Embedding API**: DashScope `text-embedding-v3`（与 AI 调用同一生态）
- **向量存储**: MySQL 表存储 chunk + embedding JSON，启动时加载到内存做余弦相似度
- **文档分块**: 按 ~500 字切分，50 字重叠，保留上下文
- **文件解析**: TXT/MD 直读，PDF 用 `pdf-parse` 库
- **知识源**: Wiki 文档保存时自动索引 + 独立文件上传

## 数据模型

```
knowledge_documents 表
  id (uuid), title, sourceType (wiki/upload), sourceId, 
  fileType, originalName, status (processing/ready/error),
  uploaderId, createdAt

knowledge_chunks 表
  id (uuid), documentId (FK), content (text), 
  embedding (json, float数组), chunkIndex (int), createdAt
```

## Task 1: 后端 - 新建 knowledge 模块

目录 `chat-backend/src/knowledge/`：

| 文件 | 职责 |
|------|------|
| `entities/knowledge-document.entity.ts` | 文档元数据实体 |
| `entities/knowledge-chunk.entity.ts` | 文档分块 + 向量实体 |
| `dto/upload-document.dto.ts` | 上传 DTO |
| `embedding.service.ts` | 封装 DashScope Embedding API 调用 |
| `chunking.service.ts` | 文本分块逻辑（500字/块，50字重叠） |
| `knowledge.service.ts` | 核心服务：文档入库、分块、索引、检索 |
| `knowledge.controller.ts` | REST API：上传文件、管理文档、搜索 |
| `knowledge.module.ts` | 模块定义 |

**核心流程：**

入库：上传文件/Wiki文档 -> 提取文本 -> 分块 -> 逐块调 Embedding API -> 存 chunks + vectors

检索：用户问题 -> Embedding API 生成向量 -> 与所有 chunks 计算余弦相似度 -> 返回 Top-K 相关块

**embedding.service.ts 关键代码：**
```typescript
// 调用 DashScope Embedding API
async embed(texts: string[]): Promise<number[][]> {
  const res = await this.client.embeddings.create({
    model: 'text-embedding-v3',
    input: texts,
    dimensions: 1024,
  });
  return res.data.map(d => d.embedding);
}
```

**knowledge.service.ts 检索逻辑：**
```typescript
async search(query: string, topK = 3): Promise<SearchResult[]> {
  const queryEmbedding = await this.embeddingService.embed([query]);
  const chunks = await this.chunkRepo.find(); // 加载所有chunks
  // 计算余弦相似度，返回 topK
  return chunks
    .map(chunk => ({ chunk, score: cosineSimilarity(queryEmbedding[0], chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

**knowledge.controller.ts API：**
- `POST /api/knowledge/upload` - 上传文件（multer）
- `GET /api/knowledge` - 文档列表
- `DELETE /api/knowledge/:id` - 删除文档（级联删除 chunks）
- `POST /api/knowledge/index-wiki` - 触发 Wiki 文档索引（管理员用）

## Task 2: 后端 - 集成到聊天流程

修改 `chat.gateway.ts`，在 `handleMessage` 中：

1. 检查 payload 是否携带 `useRag: true`
2. 若启用 RAG：调用 `knowledgeService.search(message)` 获取相关文档片段
3. 将检索结果拼入 system prompt：
```
你是一个知识库问答助手。请基于以下参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知。

--- 参考资料 ---
[文档1标题]
内容片段...

[文档2标题]
内容片段...
--- 参考资料结束 ---
```

修改 `UserMessagePayload` 接口增加 `useRag?: boolean` 字段。

同时修改 `wiki.service.ts`：在 `create()` 和 `update()` 时自动触发知识库索引。

## Task 3: 前端 - 知识库管理页面

新增 `pages/knowledge/` 组件：
- 文件上传区域（拖拽/点击上传）
- 文档列表（标题、来源类型、状态、操作）
- 删除文档

新增 `services/knowledge.service.ts` 封装 API。

## Task 4: 前端 - 聊天集成 RAG 开关

修改 `chat.component.html`：在输入区域上方添加 "知识库问答" 开关按钮。
修改 `chat.component.ts`：发送消息时附带 `useRag` 参数。
修改 `socket.service.ts`：`sendMessage` 增加 `useRag` 字段。

## 需要安装的依赖

```bash
cd chat-backend
npm install pdf-parse multer @types/multer
```

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `chat-backend/src/knowledge/entities/knowledge-document.entity.ts` |
| 新建 | `chat-backend/src/knowledge/entities/knowledge-chunk.entity.ts` |
| 新建 | `chat-backend/src/knowledge/dto/upload-document.dto.ts` |
| 新建 | `chat-backend/src/knowledge/embedding.service.ts` |
| 新建 | `chat-backend/src/knowledge/chunking.service.ts` |
| 新建 | `chat-backend/src/knowledge/knowledge.service.ts` |
| 新建 | `chat-backend/src/knowledge/knowledge.controller.ts` |
| 新建 | `chat-backend/src/knowledge/knowledge.module.ts` |
| 修改 | `chat-backend/src/app.module.ts`（导入 KnowledgeModule + 实体） |
| 修改 | `chat-backend/src/chat/chat.gateway.ts`（RAG 检索集成） |
| 修改 | `chat-backend/src/wiki/wiki.service.ts`（自动索引触发） |
| 新建 | `chat-frontend/src/app/services/knowledge.service.ts` |
| 新建 | `chat-frontend/src/app/pages/knowledge/knowledge.component.ts` |
| 新建 | `chat-frontend/src/app/pages/knowledge/knowledge.component.html` |
| 新建 | `chat-frontend/src/app/pages/knowledge/knowledge.component.css` |
| 修改 | `chat-frontend/src/app/app.routes.ts`（添加路由） |
| 修改 | `chat-frontend/src/app/components/navbar/navbar.component.html`（添加导航） |
| 修改 | `chat-frontend/src/app/chat/chat.component.html`（RAG 开关 UI） |
| 修改 | `chat-frontend/src/app/chat/chat.component.ts`（RAG 参数传递） |
| 修改 | `chat-frontend/src/app/services/socket.service.ts`（消息增加 useRag） |
