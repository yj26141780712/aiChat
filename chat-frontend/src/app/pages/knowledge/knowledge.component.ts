import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { KnowledgeService, KnowledgeDoc } from '../../services/knowledge.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe, NavbarComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css',
})
export class KnowledgeComponent implements OnInit {
  documents = signal<KnowledgeDoc[]>([]);
  isUploading = signal(false);
  isIndexing = signal(false);
  dragOver = signal(false);

  /** 预览弹窗状态 */
  previewVisible = signal(false);
  previewTitle = signal('');
  previewContent = signal('');
  previewLoading = signal(false);

  constructor(private knowledgeService: KnowledgeService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.knowledgeService.getDocuments().subscribe({
      next: (data) => this.documents.set(data),
      error: (err) => console.error('加载知识库失败:', err),
    });
  }

  /** 点击上传 */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  /** 拖拽放置 */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.uploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  /** 批量上传文件 */
  uploadFiles(files: File[]): void {
    this.isUploading.set(true);
    let completed = 0;
    let hasError = false;

    files.forEach((file) => {
      this.knowledgeService.uploadFile(file).subscribe({
        next: () => {
          completed++;
          if (completed === files.length) {
            this.isUploading.set(false);
            this.loadDocuments();
          }
        },
        error: (err) => {
          console.error('上传失败:', err);
          hasError = true;
          completed++;
          if (completed === files.length) {
            this.isUploading.set(false);
            this.loadDocuments();
          }
        },
      });
    });
  }

  /** 删除文档 */
  deleteDocument(id: string): void {
    if (!confirm('确认删除该知识库文档？')) return;
    this.knowledgeService.deleteDocument(id).subscribe({
      next: () => this.loadDocuments(),
      error: (err) => console.error('删除失败:', err),
    });
  }

  /** 触发 Wiki 索引 */
  indexWiki(): void {
    this.isIndexing.set(true);
    this.knowledgeService.indexWiki().subscribe({
      next: () => {
        this.isIndexing.set(false);
        this.loadDocuments();
      },
      error: (err) => {
        console.error('索引失败:', err);
        this.isIndexing.set(false);
      },
    });
  }

  /** 预览文档内容 */
  openPreview(docId: string): void {
    this.previewVisible.set(true);
    this.previewLoading.set(true);
    this.previewTitle.set('加载中...');
    this.previewContent.set('');

    this.knowledgeService.getPreview(docId).subscribe({
      next: (data) => {
        this.previewTitle.set(data.title);
        this.previewContent.set(data.content);
        this.previewLoading.set(false);
      },
      error: (err) => {
        this.previewTitle.set('加载失败');
        this.previewContent.set(err.error?.message || '无法获取文档内容');
        this.previewLoading.set(false);
      },
    });
  }

  /** 关闭预览 */
  closePreview(): void {
    this.previewVisible.set(false);
  }

  /** 状态标签样式 */
  statusLabel(status: string): string {
    switch (status) {
      case 'ready': return '已就绪';
      case 'processing': return '处理中';
      case 'error': return '错误';
      default: return status;
    }
  }

  sourceLabel(type: string): string {
    return type === 'wiki' ? 'Wiki' : '上传';
  }
}
