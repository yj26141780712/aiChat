import { Component, OnInit, signal } from '@angular/core';
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
  document = signal<WikiDocument | null>(null);
  title = signal('');
  content = signal('');
  isSaving = signal(false);
  isLoading = signal(true);

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
    this.wikiService.updateDocument(this.docId, {
      title: this.title(),
      content: this.content(),
    }).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false),
    });
  }

  /** 内容变化时触发自动保存（防抖 2 秒） */
  onContentChange(): void {
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
}
