import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { KnowledgeService, KnowledgeDoc } from '../../services/knowledge.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PdfViewerComponent } from '../../components/pdf-viewer/pdf-viewer.component';
import { PdfImageExtractor, ExtractedImage } from '../../utils/pdf-image-extractor';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe, NavbarComponent, PdfViewerComponent],
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
  
  // 文件预览相关
  previewFileType = signal<string | null>(null);
  previewFileUrl = signal<string>('');
  previewOriginalName = signal<string>('');

  private pdfExtractor = new PdfImageExtractor();

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
  async uploadFiles(files: File[]): Promise<void> {
    this.isUploading.set(true);
    let completed = 0;
    let hasError = false;

    for (const file of files) {
      try {
        // 如果是 PDF，先提取图片
        if (file.type === 'application/pdf') {
          console.log(`检测到 PDF 文件: ${file.name}，开始提取图片...`);
          
          try {
            const images = await this.pdfExtractor.extractImages(file);
            console.log(`从 ${file.name} 提取了 ${images.length} 张图片`);
            
            // 先上传图片
            if (images.length > 0) {
              for (const img of images) {
                await this.uploadImage(img.blob, img.filename);
              }
              console.log(`${images.length} 张图片已上传到知识库`);
            }
          } catch (err: any) {
            console.warn(`PDF 图片提取失败: ${err.message}`);
          }
        }
        
        // 上传原始文件（文本部分）
        await new Promise<void>((resolve, reject) => {
          this.knowledgeService.uploadFile(file).subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
          });
        });
        
        completed++;
      } catch (err) {
        console.error(`上传失败: ${file.name}`, err);
        hasError = true;
        completed++;
      }
    }

    // 所有文件处理完成后刷新列表
    this.isUploading.set(false);
    this.loadDocuments();
    
    if (!hasError) {
      console.log('所有文件上传完成');
    }
  }

  /** 上传图片到知识库 */
  private async uploadImage(blob: Blob, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 将 Blob 转为 File 对象
      const imageFile = new File([blob], filename, { type: blob.type });
      
      this.knowledgeService.uploadFile(imageFile).subscribe({
        next: () => resolve(),
        error: (err) => reject(err),
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
    this.previewFileType.set(null);
    this.previewFileUrl.set('');
    this.previewOriginalName.set('');

    this.knowledgeService.getPreview(docId).subscribe({
      next: (data) => {
        this.previewTitle.set(data.title);
        
        // Wiki 文档：显示文本内容
        if (data.sourceType === 'wiki') {
          this.previewContent.set(data.content || '');
          this.previewFileType.set('text');
        } else {
          // 上传文档：显示文件预览
          this.previewFileType.set(data.fileType || null);
          this.previewOriginalName.set(data.originalName || data.title);
                  
          if (data.filePath) {
            const fullUrl = `${environment.apiBase}${data.filePath}`;
            this.previewFileUrl.set(fullUrl);
          }
                  
          // txt/md 文件：直接获取文件文本内容
          if (data.fileType === 'txt' || data.fileType === 'md') {
            if (data.content) {
              this.previewContent.set(data.content);
            } else if (data.filePath) {
              // 通过 HTTP 获取文件文本
              fetch(`${environment.apiBase}${data.filePath}`)
                .then(r => r.text())
                .then(text => this.previewContent.set(text))
                .catch(() => this.previewContent.set('文件内容加载失败'));
            }
          }
        }
        
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
