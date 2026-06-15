import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService } from '../services/socket.service';
import { HttpService, ConversationItem } from '../services/http.service';

/** 前端显示用的消息结构 */
interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages = signal<DisplayMessage[]>([]);
  inputText = signal<string>('');
  isLoading = signal<boolean>(false);
  conversations = signal<ConversationItem[]>([]);
  currentTitle = signal<string>('新对话');

  private subscriptions: Subscription[] = [];

  constructor(
    private socketService: SocketService,
    private httpService: HttpService,
  ) {}

  ngOnInit(): void {
    // 监听流式内容块
    this.subscriptions.push(
      this.socketService.onStreamChunk().subscribe((data) => {
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content += data.content;
          this.messages.set([...msgs]);
          this.scrollToBottom();
        }
      }),
    );

    // 监听流式结束
    this.subscriptions.push(
      this.socketService.onStreamDone().subscribe((data) => {
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.isStreaming = false;
          lastMsg.content = data.fullReply;
          this.messages.set([...msgs]);
        }
        this.isLoading.set(false);
        this.loadConversations(); // 刷新对话列表
      }),
    );

    // 监听错误
    this.subscriptions.push(
      this.socketService.onStreamError().subscribe((data) => {
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = '⚠️ ' + data.message;
          lastMsg.isStreaming = false;
          this.messages.set([...msgs]);
        }
        this.isLoading.set(false);
      }),
    );

    // 监听对话创建
    this.subscriptions.push(
      this.socketService.onConversationCreated().subscribe((data) => {
        console.log('对话已创建:', data.conversationId);
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /** 加载对话列表 */
  loadConversations(): void {
    const userId = this.socketService.getSocketId();
    if (!userId) return;

    this.httpService.getConversations(userId).subscribe({
      next: (data) => this.conversations.set(data),
      error: (err) => console.error('加载对话列表失败:', err),
    });
  }

  /** 加载某个历史对话的消息 */
  loadConversation(conversationId: string): void {
    this.httpService.getMessages(conversationId).subscribe({
      next: (messages) => {
        const displayMsgs: DisplayMessage[] = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        this.messages.set(displayMsgs);
        // 更新标题
        const conv = this.conversations().find((c) => c.id === conversationId);
        if (conv) this.currentTitle.set(conv.title);
        this.scrollToBottom();
      },
      error: (err) => console.error('加载对话失败:', err),
    });
  }

  /** 发送消息 */
  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    this.inputText.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    this.socketService.sendMessage(text);
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
}
