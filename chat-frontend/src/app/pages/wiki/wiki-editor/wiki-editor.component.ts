import { Component, OnInit, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { WikiService, WikiDocument } from '../../../services/wiki.service';
import { NavbarComponent } from '../../../components/navbar/navbar.component';

@Component({
  selector: 'app-wiki-editor',
  standalone: true,
  imports: [FormsModule, NavbarComponent],
  templateUrl: './wiki-editor.component.html',
  styleUrl: './wiki-editor.component.css',
})
export class WikiEditorComponent implements OnInit {
  @ViewChild('editorTextarea') textareaRef!: ElementRef<HTMLTextAreaElement>;

  document = signal<WikiDocument | null>(null);
  title = signal('');
  content = signal('');
  isSaving = signal(false);
  isLoading = signal(true);
  saveStatus = signal<'saved' | 'saving' | 'unsaved' | ''>('');
  charCount = signal(0);

  private docId: string = '';
  private autoSaveTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wikiService: WikiService,
  ) {}

  ngOnInit(): void {
    this.docId = this.route.snapshot.paramMap.get('id') || '';
    if (this.docId) {
      this.loadDocument();
    }
  }

  loadDocument(): void {
    this.wikiService.getDocument(this.docId).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.title.set(doc.title);
        this.content.set(doc.content);
        this.charCount.set(doc.content.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/wiki']);
      },
    });
  }

  /** 保存文档 */
  save(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.saveStatus.set('saving');
    this.wikiService.updateDocument(this.docId, {
      title: this.title(),
      content: this.content(),
    }).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.isSaving.set(false);
        this.saveStatus.set('saved');
        setTimeout(() => this.saveStatus.set(''), 2000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveStatus.set('unsaved');
      },
    });
  }

  /** 内容变化时触发自动保存（防抖 2 秒） */
  onContentChange(): void {
    this.charCount.set(this.content().length);
    this.saveStatus.set('unsaved');
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.save(), 2000);
  }

  /** 渲染 Markdown 预览 */
  get previewHtml(): string {
    return marked(this.content(), { breaks: true }) as string;
  }

  /** 返回列表 */
  goBack(): void {
    this.router.navigate(['/wiki']);
  }

  // ===== Markdown 格式化工具栏 =====

  /** 在光标处插入文本或包裹选中文本 */
  private insertAtCursor(before: string, after: string = '', placeholder: string = ''): void {
    const ta = this.textareaRef?.nativeElement;
    if (!ta) return;
    ta.focus();

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = this.content().substring(start, end);
    const insert = selected || placeholder;
    const newText = this.content().substring(0, start) + before + insert + after + this.content().substring(end);
    this.content.set(newText);
    this.onContentChange();

    // 恢复光标位置
    setTimeout(() => {
      if (selected) {
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + selected.length;
      } else {
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + placeholder.length;
      }
    });
  }

  /** 在行首插入前缀 */
  private insertLinePrefix(prefix: string): void {
    const ta = this.textareaRef?.nativeElement;
    if (!ta) return;
    ta.focus();

    const start = ta.selectionStart;
    const text = this.content();
    // 找到当前行的起始位置
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    this.content.set(newText);
    this.onContentChange();

    setTimeout(() => {
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length;
    });
  }

  bold(): void { this.insertAtCursor('**', '**', '粗体文本'); }
  italic(): void { this.insertAtCursor('*', '*', '斜体文本'); }
  strikethrough(): void { this.insertAtCursor('~~', '~~', '删除线文本'); }
  heading(level: number): void { this.insertLinePrefix('#'.repeat(level) + ' '); }
  quote(): void { this.insertLinePrefix('> '); }
  unorderedList(): void { this.insertLinePrefix('- '); }
  orderedList(): void { this.insertLinePrefix('1. '); }
  code(): void { this.insertAtCursor('`', '`', '代码'); }
  codeBlock(): void { this.insertAtCursor('\n```\n', '\n```\n', '代码块'); }
  link(): void { this.insertAtCursor('[', '](https://)', '链接文本'); }
  image(): void { this.insertAtCursor('![', '](https://)', '图片描述'); }
  table(): void { this.insertAtCursor('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'); }
  horizontalRule(): void { this.insertAtCursor('\n---\n'); }
  taskList(): void { this.insertLinePrefix('- [ ] '); }

  /** Tab 键支持：插入 2 个空格 */
  onTab(event: Event): void {
    event.preventDefault();
    this.insertAtCursor('  ');
  }

  /** 键盘快捷键 */
  @HostListener('document:keydown', ['$event'])
  handleShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          this.save();
          break;
        case 'b':
          event.preventDefault();
          this.bold();
          break;
        case 'i':
          event.preventDefault();
          this.italic();
          break;
      }
    }
  }
}
