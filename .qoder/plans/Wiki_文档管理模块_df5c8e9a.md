# Wiki 文档管理模块

## 技术决策

- 后端：NestJS 新增 `wiki` 模块，复用 JWT 认证守卫
- 前端：Angular 新增 wiki 路由和组件，使用 `marked` 渲染 Markdown
- 数据库：MySQL + TypeORM，新增 `documents` 表
- 编辑器：纯 textarea + 实时预览（简单可靠，后续可升级富文本编辑器）

## 数据模型

**Document 实体** (`chat-backend/src/wiki/entities/document.entity.ts`)
```typescript
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) content: string;        // Markdown 内容
  @ManyToOne(() => User, { onDelete: 'SET NULL' }) author: User;
  @Column({ nullable: true }) authorId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

## Task 1: 后端 - 创建 Wiki 模块

新建目录 `chat-backend/src/wiki/`：
- `wiki.module.ts` - 模块定义，注册 TypeORM 实体
- `entities/document.entity.ts` - 文档实体
- `wiki.service.ts` - CRUD 方法：`create()`, `findAll()`, `findOne()`, `update()`, `delete()`
- `wiki.controller.ts` - REST API（均需 JWT 认证）：
  - `GET /api/wiki` - 文档列表（分页，按更新时间倒序）
  - `GET /api/wiki/:id` - 文档详情
  - `POST /api/wiki` - 新建文档
  - `PATCH /api/wiki/:id` - 更新文档
  - `DELETE /api/wiki/:id` - 删除文档
- `dto/create-document.dto.ts` - 请求校验 DTO
- 在 `app.module.ts` 中导入 `WikiModule`

## Task 2: 前端 - 创建 Wiki 页面组件

新增 `chat-frontend/src/app/pages/wiki/`：
- `wiki-list/` - 文档列表页：显示标题、作者、更新时间，支持新建/删除
- `wiki-editor/` - 文档编辑页：左侧 textarea 编辑 Markdown，右侧实时预览渲染结果，支持保存

## Task 3: 前端 - 路由和导航集成

- `app.routes.ts` 添加 `/wiki` 和 `/wiki/:id` 路由（需 AuthGuard）
- `navbar.component.html` 添加 "Wiki" 导航链接

## Task 4: 前端 - Wiki HTTP 服务

- `services/wiki.service.ts` - 封装 Wiki API 调用（HttpClient）

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `chat-backend/src/wiki/entities/document.entity.ts` |
| 新建 | `chat-backend/src/wiki/dto/create-document.dto.ts` |
| 新建 | `chat-backend/src/wiki/wiki.service.ts` |
| 新建 | `chat-backend/src/wiki/wiki.controller.ts` |
| 新建 | `chat-backend/src/wiki/wiki.module.ts` |
| 修改 | `chat-backend/src/app.module.ts`（导入 WikiModule） |
| 新建 | `chat-frontend/src/app/services/wiki.service.ts` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-list/wiki-list.component.ts` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-list/wiki-list.component.html` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-list/wiki-list.component.css` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-editor/wiki-editor.component.ts` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-editor/wiki-editor.component.html` |
| 新建 | `chat-frontend/src/app/pages/wiki/wiki-editor/wiki-editor.component.css` |
| 修改 | `chat-frontend/src/app/app.routes.ts`（添加路由） |
| 修改 | `chat-frontend/src/app/components/navbar/navbar.component.html`（添加导航） |
