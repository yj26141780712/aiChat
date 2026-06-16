import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { SocketService } from '../services/socket.service';
import { HttpService, ConversationItem } from '../services/http.service';
import { NavbarComponent } from '../components/navbar/navbar.component';

/** 前端显示用的消息结构 */
interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  /** 思考内容（深度思考模式） */
  thinkingContent?: string;
  /** 是否正在思考中 */
  isThinking?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, NavbarComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages = signal<DisplayMessage[]>([]);
  inputText = signal<string>('');
  conversations = signal<ConversationItem[]>([]);
  currentTitle = signal<string>('新对话');
  currentConversationId = signal<string | null>(null);

  /** 正在后台进行流式回复的对话 ID 集合 */
  streamingConversations = signal<Set<string>>(new Set());

  /** 后台流式内容缓冲区：conversationId -> 已收到的部分内容 */
  private streamingBuffers: Map<string, string> = new Map();

  /** 正在重命名的对话 ID */
  editingConversationId = signal<string | null>(null);
  /** 重命名输入框的值 */
  editingTitle = signal<string>('');

  /** 当前对话是否正在流式回复 */
  get isCurrentStreaming(): boolean {
    const id = this.currentConversationId();
    return id !== null && this.streamingConversations().has(id);
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private socketService: SocketService,
    private httpService: HttpService,
  ) {}

  ngOnInit(): void {
    // 连接 WebSocket
    this.socketService.connect();

    // 监听流式思考内容
    this.subscriptions.push(
      this.socketService.onStreamThinking().subscribe((data) => {
        const convId = data.conversationId;
        if (convId !== this.currentConversationId()) return;
        // 当前对话：更新思考内容
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isThinking) {
          lastMsg.thinkingContent = (lastMsg.thinkingContent || '') + data.content;
          this.messages.set([...msgs]);
          this.scrollToBottom();
        }
      }),
    );

    // 监听流式内容块
    this.subscriptions.push(
      this.socketService.onStreamChunk().subscribe((data) => {
        const convId = data.conversationId;
        if (convId !== this.currentConversationId()) {
          // 非当前对话：缓存到缓冲区
          const buffered = this.streamingBuffers.get(convId) || '';
          this.streamingBuffers.set(convId, buffered + data.content);
          return;
        }
        // 当前对话：直接更新 UI
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          // 收到第一个内容块时，结束思考状态
          if (lastMsg.isThinking) {
            lastMsg.isThinking = false;
          }
          lastMsg.content += data.content;
          this.messages.set([...msgs]);
          this.scrollToBottom();
        }
      }),
    );

    // 监听流式结束
    this.subscriptions.push(
      this.socketService.onStreamDone().subscribe((data) => {
        const convId = data.conversationId;
        // 从后台流式集合中移除
        this.streamingConversations.update(set => {
          const next = new Set(set);
          next.delete(convId);
          return next;
        });

        if (convId === this.currentConversationId()) {
          // 当前对话：用完整回复更新消息列表
          const msgs = this.messages();
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.isStreaming = false;
            lastMsg.isThinking = false;
            lastMsg.content = data.fullReply;
            this.messages.set([...msgs]);
          }
        }
        // 清理缓冲区
        this.streamingBuffers.delete(convId);
        // 无论是否当前对话，都刷新对话列表（后台对话可能已完成）
        this.loadConversations();
      }),
    );

    // 监听错误
    this.subscriptions.push(
      this.socketService.onStreamError().subscribe((data) => {
        const convId = data.conversationId;
        // 从后台流式集合中移除
        if (convId) {
          this.streamingConversations.update(set => {
            const next = new Set(set);
            next.delete(convId);
            return next;
          });
          this.streamingBuffers.delete(convId);
        }
        // 只更新当前对话的 UI
        if (convId && convId !== this.currentConversationId()) return;
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          lastMsg.content = '⚠️ ' + data.message;
          lastMsg.isStreaming = false;
          this.messages.set([...msgs]);
        }
      }),
    );

    // 监听对话创建
    this.subscriptions.push(
      this.socketService.onConversationCreated().subscribe((data) => {
        console.log('对话已创建:', data.conversationId);
        this.currentConversationId.set(data.conversationId);
        this.loadConversations();
      }),
    );

    // 监听标题更新
    this.subscriptions.push(
      this.socketService.onTitleUpdated().subscribe((data) => {
        this.currentTitle.set(data.title);
        this.loadConversations();
      }),
    );

    // 页面加载时加载历史对话
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.socketService.disconnect();
  }

  /** 加载对话列表 */
  loadConversations(): void {
    this.httpService.getConversations().subscribe({
      next: (data) => this.conversations.set(data),
      error: (err) => console.error('加载对话列表失败:', err),
    });
  }

  /** 加载某个历史对话的消息 */
  loadConversation(conversationId: string): void {
    this.currentConversationId.set(conversationId);
    this.socketService.setConversation(conversationId);

    this.httpService.getMessages(conversationId).subscribe({
      next: (messages) => {
        const displayMsgs: DisplayMessage[] = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        // 如果该对话正在后台流式，用缓冲区已积累的内容作为占位消息
        if (this.streamingConversations().has(conversationId)) {
          const buffered = this.streamingBuffers.get(conversationId) || '';
          displayMsgs.push({ role: 'assistant', content: buffered, isStreaming: true });
        }
        this.messages.set(displayMsgs);
        // 更新标题
        const conv = this.conversations().find((c) => c.id === conversationId);
        if (conv) this.currentTitle.set(conv.title);
        this.scrollToBottom();
      },
      error: (err) => console.error('加载对话失败:', err),
    });
  }

  /** 开始新对话 */
  newConversation(): void {
    this.messages.set([]);
    this.currentTitle.set('新对话');
    this.currentConversationId.set(null);
    this.socketService.createConversation();
  }

  /** 发送消息 */
  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text) return;
    const convId = this.currentConversationId();
    // 只阻止当前对话正在流式时重复发送
    if (convId && this.streamingConversations().has(convId)) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'assistant', content: '', isStreaming: true, isThinking: true, thinkingContent: '' },
    ]);

    this.inputText.set('');

    // 将当前对话加入后台流式集合
    if (convId) {
      this.streamingConversations.update(set => new Set(set).add(convId));
    }

    this.scrollToBottom();
    this.socketService.sendMessage(text, convId ?? undefined);
  }

  /** Enter 键发送 */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** 滚动到底部 */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }

  /** 将 Markdown 渲染为 HTML */
  renderMarkdown(content: string): string {
    return marked(content, { breaks: true }) as string;
  }

  // ===== 对话历史管理 =====

  /** 开始重命名对话 */
  startRename(conv: ConversationItem): void {
    this.editingConversationId.set(conv.id);
    this.editingTitle.set(conv.title);
  }

  /** 确认重命名 */
  confirmRename(conversationId: string): void {
    const title = this.editingTitle().trim();
    if (!title) {
      this.cancelRename();
      return;
    }
    this.httpService.renameConversation(conversationId, title).subscribe({
      next: () => {
        this.editingConversationId.set(null);
        this.loadConversations();
        // 如果是当前对话，更新标题
        if (this.currentConversationId() === conversationId) {
          this.currentTitle.set(title);
        }
      },
      error: (err) => console.error('重命名失败:', err),
    });
  }

  /** 取消重命名 */
  cancelRename(): void {
    this.editingConversationId.set(null);
    this.editingTitle.set('');
  }

  /** 删除单个对话 */
  deleteConversation(conversationId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('确认删除该对话？')) return;
    this.httpService.deleteConversation(conversationId).subscribe({
      next: () => {
        // 如果删除的是当前对话，清空显示
        if (this.currentConversationId() === conversationId) {
          this.messages.set([]);
          this.currentConversationId.set(null);
          this.currentTitle.set('新对话');
        }
        this.loadConversations();
      },
      error: (err) => console.error('删除失败:', err),
    });
  }

  /** 清空所有对话 */
  deleteAllConversations(): void {
    if (!confirm('确认清空所有对话记录？此操作不可恢复。')) return;
    this.httpService.deleteAllConversations().subscribe({
      next: () => {
        this.messages.set([]);
        this.currentConversationId.set(null);
        this.currentTitle.set('新对话');
        this.conversations.set([]);
      },
      error: (err) => console.error('清空失败:', err),
    });
  }

  /** 切换思考面板展开/收起 */
  expandedThinking = signal<Set<number>>(new Set());

  toggleThinking(index: number): void {
    this.expandedThinking.update(set => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
}
