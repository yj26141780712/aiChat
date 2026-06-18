import {
  Component, Input, OnDestroy, ElementRef, ViewChild,
  AfterViewInit, OnChanges, SimpleChanges, ChangeDetectorRef, inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';

// 动态加载 pdf.js
function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.mjs';
    script.type = 'module';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.mjs';
        resolve(lib);
      } else { reject(new Error('pdf.js 加载失败')); }
    };
    script.onerror = () => reject(new Error('pdf.js 脚本加载失败'));
    document.head.appendChild(script);
  });
}

interface OutlineItem { title: string; page: number; children: OutlineItem[]; }
interface SearchResult { page: number; snippet: string; }

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <div class="pdf-wrapper">
      <!-- 工具栏 -->
      <div class="pdf-toolbar">
        <button class="tb-btn" (click)="toggleOutline()" [class.active]="showOutline" title="目录">☰</button>

        <div class="tb-search">
          <input
            type="text"
            placeholder="搜索..."
            [(ngModel)]="searchQuery"
            (keydown.enter)="doSearch()"
            (input)="onSearchInput()"
          />
          @if (searchQuery) {
            <button class="tb-btn-sm" (click)="clearSearch()">✕</button>
          }
          @if (searchResults.length > 0) {
            <span class="search-info">{{ currentResultIdx + 1 }}/{{ searchResults.length }}</span>
            <button class="tb-btn-sm" (click)="prevResult()">◀</button>
            <button class="tb-btn-sm" (click)="nextResult()">▶</button>
          }
          <button class="tb-btn" (click)="doSearch()">🔍</button>
        </div>

        <div class="tb-spacer"></div>

        <div class="tb-nav">
          <button class="tb-btn" (click)="goToPage(currentPage - 1)" [disabled]="currentPage <= 1">◀</button>
          <input
            type="number"
            class="page-input"
            [value]="currentPage"
            (change)="onPageInput($event)"
            [min]="1"
            [max]="totalPages"
          />
          <span class="page-total">/ {{ totalPages }}</span>
          <button class="tb-btn" (click)="goToPage(currentPage + 1)" [disabled]="currentPage >= totalPages">▶</button>
        </div>

        <div class="tb-zoom">
          <button class="tb-btn" (click)="zoomOut()">−</button>
          <span class="zoom-val">{{ Math.round(scale * 100) }}%</span>
          <button class="tb-btn" (click)="zoomIn()">+</button>
        </div>
      </div>

      <!-- 主体：目录 + 页面 -->
      <div class="pdf-body">
        <!-- 目录侧边栏 -->
        @if (showOutline) {
          <div class="pdf-sidebar">
            @if (outline.length === 0) {
              <div class="sidebar-empty">此 PDF 无目录</div>
            }
            <ul class="outline-list">
              @for (item of outline; track $index) {
                <ng-container *ngTemplateOutlet="outlineTpl; context: { item: item, depth: 0 }"></ng-container>
              }
            </ul>
          </div>
        }

        <!-- 页面区域 -->
        <div class="pdf-pages-scroll" #scrollRef (scroll)="onScroll()">
          @if (loading) {
            <div class="pdf-loading">PDF 加载中...</div>
          }
          @if (error) {
            <div class="pdf-error">{{ error }}</div>
          }
          <div class="pdf-pages" #pagesRef>
            @for (page of pages; track $index) {
              <div class="pdf-page-wrapper" [attr.data-page]="$index + 1">
                <div class="page-label">第 {{ $index + 1 }} 页</div>
                <canvas [attr.id]="'pdf-page-' + $index"></canvas>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- 目录递归模板 -->
      <ng-template #outlineTpl let-item="item" let-depth="depth">
        <li class="outline-item" [style.paddingLeft.px]="depth * 16 + 8">
          <a (click)="goToPage(item.page); $event.preventDefault()">{{ item.title }}</a>
          @if (item.children.length > 0) {
            <ul class="outline-sub">
              @for (child of item.children; track $index) {
                <ng-container *ngTemplateOutlet="outlineTpl; context: { item: child, depth: depth + 1 }"></ng-container>
              }
            </ul>
          }
        </li>
      </ng-template>
    </div>
  `,
  styles: [`
    .pdf-wrapper { display: flex; flex-direction: column; height: 65vh; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; }

    /* 工具栏 */
    .pdf-toolbar {
      display: flex; align-items: center; gap: 8px; padding: 6px 12px;
      background: #f8f9fa; border-bottom: 1px solid #ddd; flex-shrink: 0;
    }
    .tb-btn {
      background: none; border: 1px solid #ccc; border-radius: 4px;
      padding: 4px 8px; cursor: pointer; font-size: 14px; color: #333;
    }
    .tb-btn:hover { background: #e9ecef; }
    .tb-btn:disabled { opacity: 0.4; cursor: default; }
    .tb-btn.active { background: #d0e4ff; border-color: #4a90d9; }
    .tb-btn-sm {
      background: none; border: none; cursor: pointer; padding: 2px 4px;
      font-size: 12px; color: #555;
    }
    .tb-btn-sm:hover { color: #000; }

    .tb-search {
      display: flex; align-items: center; gap: 4px; position: relative;
    }
    .tb-search input {
      border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px;
      font-size: 13px; width: 140px; outline: none;
    }
    .tb-search input:focus { border-color: #4a90d9; }
    .search-info { font-size: 12px; color: #666; white-space: nowrap; }

    .tb-spacer { flex: 1; }

    .tb-nav {
      display: flex; align-items: center; gap: 4px;
    }
    .page-input {
      width: 48px; text-align: center; border: 1px solid #ccc;
      border-radius: 4px; padding: 3px; font-size: 13px;
    }
    .page-total { font-size: 13px; color: #666; }

    .tb-zoom {
      display: flex; align-items: center; gap: 4px;
    }
    .zoom-val { font-size: 12px; color: #555; min-width: 40px; text-align: center; }

    /* 主体 */
    .pdf-body { display: flex; flex: 1; overflow: hidden; }

    /* 目录侧边栏 */
    .pdf-sidebar {
      width: 220px; border-right: 1px solid #ddd; background: #fafafa;
      overflow-y: auto; flex-shrink: 0; padding: 8px 0;
    }
    .sidebar-empty { text-align: center; color: #999; padding: 20px; font-size: 13px; }
    .outline-list { list-style: none; margin: 0; padding: 0; }
    .outline-item { }
    .outline-item a {
      display: block; padding: 5px 8px; font-size: 13px; color: #333;
      cursor: pointer; text-decoration: none; border-radius: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .outline-item a:hover { background: #e3e8ef; color: #1a73e8; }
    .outline-sub { list-style: none; margin: 0; padding: 0; }

    /* 页面区域 */
    .pdf-pages-scroll {
      flex: 1; overflow-y: auto; background: #e8e8e8;
    }
    .pdf-loading, .pdf-error { text-align: center; padding: 40px; color: #666; }
    .pdf-error { color: #d32f2f; }
    .pdf-pages {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 16px;
    }
    .pdf-page-wrapper {
      background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      border-radius: 4px; overflow: hidden;
    }
    .page-label {
      text-align: center; font-size: 11px; color: #999;
      padding: 4px; background: #f5f5f5; border-bottom: 1px solid #eee;
    }
    .pdf-page-wrapper canvas { display: block; }
  `],
})
export class PdfViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() src = '';
  @ViewChild('pagesRef') pagesRef!: ElementRef;
  @ViewChild('scrollRef') scrollRef!: ElementRef;

  Math = Math;
  loading = false;
  error = '';
  pages: number[] = [];
  totalPages = 0;
  currentPage = 1;
  scale = 1.0;

  // 目录
  showOutline = false;
  outline: OutlineItem[] = [];

  // 搜索
  searchQuery = '';
  searchResults: SearchResult[] = [];
  currentResultIdx = -1;

  private pdfDoc: any = null;
  private containerReady = false;
  private cdr = inject(ChangeDetectorRef);
  private pageTexts: string[] = [];
  private scrollTimer: any = null;

  ngAfterViewInit(): void {
    this.containerReady = true;
    if (this.src) this.loadPdf();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !changes['src'].firstChange && this.containerReady) {
      this.loadPdf();
    }
  }

  ngOnDestroy(): void {
    this.pdfDoc?.destroy();
    clearTimeout(this.scrollTimer);
  }

  // ===== 加载 PDF =====
  private async loadPdf(): Promise<void> {
    if (!this.src) return;
    await new Promise(r => setTimeout(r, 0));

    this.loading = true;
    this.error = '';
    this.pages = [];
    this.outline = [];
    this.searchResults = [];
    this.currentResultIdx = -1;
    this.totalPages = 0;
    this.currentPage = 1;
    this.pdfDoc?.destroy();
    this.pdfDoc = null;
    this.cdr.detectChanges();

    try {
      const pdfjsLib = await loadPdfJs();
      this.pdfDoc = await pdfjsLib.getDocument(this.src).promise;
      this.totalPages = this.pdfDoc.numPages;
      this.pages = Array.from({ length: this.totalPages }, (_, i) => i);
      this.loading = false;

      // 提取目录
      await this.extractOutline();
      this.cdr.detectChanges();

      // 自适应缩放
      await new Promise(r => setTimeout(r, 50));
      await this.renderAllPages();

      // 预提取文本（用于搜索）
      this.extractAllText();
    } catch (err: any) {
      this.loading = false;
      this.error = `PDF 加载失败: ${err.message}`;
      this.cdr.detectChanges();
    }
  }

  // ===== 渲染页面 =====
  private async renderAllPages(): Promise<void> {
    if (!this.pdfDoc) return;
    const container = this.pagesRef?.nativeElement as HTMLElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 32;

    for (let i = 0; i < this.pages.length; i++) {
      const page = await this.pdfDoc.getPage(i + 1);
      const canvas = container.querySelector(`#pdf-page-${i}`) as HTMLCanvasElement;
      if (!canvas) continue;

      const ctx = canvas.getContext('2d')!;
      const viewport = page.getViewport({ scale: 1 });
      const baseScale = containerWidth / viewport.width;
      const finalScale = baseScale * this.scale;
      const scaledViewport = page.getViewport({ scale: finalScale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      page.cleanup();
    }
  }

  // ===== 目录 =====
  private async extractOutline(): Promise<void> {
    if (!this.pdfDoc) return;
    try {
      const rawOutline = await this.pdfDoc.getOutline();
      if (rawOutline && rawOutline.length > 0) {
        this.outline = await this.parseOutlineItems(rawOutline);
      }
    } catch (e) {
      console.warn('提取目录失败:', e);
    }
  }

  private async parseOutlineItems(items: any[]): Promise<OutlineItem[]> {
    const result: OutlineItem[] = [];
    for (const item of items) {
      let pageNum = 1;
      try {
        if (item.dest) {
          const dest = typeof item.dest === 'string'
            ? await this.pdfDoc.getDestination(item.dest)
            : item.dest;
          if (dest && dest.length > 0) {
            const ref = dest[0];
            const idx = await this.pdfDoc.getPageIndex(ref);
            pageNum = idx + 1;
          }
        }
      } catch { /* ignore */ }

      const children = item.items
        ? await this.parseOutlineItems(item.items)
        : [];

      result.push({ title: item.title || '无标题', page: pageNum, children });
    }
    return result;
  }

  toggleOutline(): void {
    this.showOutline = !this.showOutline;
  }

  // ===== 搜索 =====
  private async extractAllText(): Promise<void> {
    if (!this.pdfDoc) return;
    this.pageTexts = [];
    for (let i = 1; i <= this.totalPages; i++) {
      try {
        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str || '').join(' ');
        this.pageTexts.push(text);
        page.cleanup();
      } catch {
        this.pageTexts.push('');
      }
    }
  }

  doSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) { this.clearSearch(); return; }

    this.searchResults = [];
    for (let i = 0; i < this.pageTexts.length; i++) {
      const text = this.pageTexts[i].toLowerCase();
      let idx = text.indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + q.length + 20);
        const snippet = '...' + this.pageTexts[i].substring(start, end) + '...';
        this.searchResults.push({ page: i + 1, snippet });
      }
    }

    this.currentResultIdx = this.searchResults.length > 0 ? 0 : -1;
    if (this.currentResultIdx >= 0) {
      this.goToPage(this.searchResults[0].page);
    }
    this.cdr.detectChanges();
  }

  onSearchInput(): void {
    if (!this.searchQuery.trim()) this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.currentResultIdx = -1;
  }

  prevResult(): void {
    if (this.searchResults.length === 0) return;
    this.currentResultIdx = (this.currentResultIdx - 1 + this.searchResults.length) % this.searchResults.length;
    this.goToPage(this.searchResults[this.currentResultIdx].page);
    this.cdr.detectChanges();
  }

  nextResult(): void {
    if (this.searchResults.length === 0) return;
    this.currentResultIdx = (this.currentResultIdx + 1) % this.searchResults.length;
    this.goToPage(this.searchResults[this.currentResultIdx].page);
    this.cdr.detectChanges();
  }

  // ===== 导航 =====
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;

    const wrapper = (this.pagesRef?.nativeElement as HTMLElement)?.querySelector(
      `.pdf-page-wrapper[data-page="${page}"]`
    );
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.cdr.detectChanges();
  }

  onPageInput(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.goToPage(val);
  }

  onScroll(): void {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      const scrollEl = this.scrollRef?.nativeElement as HTMLElement;
      if (!scrollEl) return;

      const wrappers = scrollEl.querySelectorAll('.pdf-page-wrapper');
      const scrollTop = scrollEl.scrollTop + scrollEl.clientHeight / 3;

      for (const w of wrappers) {
        const el = w as HTMLElement;
        if (el.offsetTop + el.offsetHeight > scrollTop) {
          const page = parseInt(el.getAttribute('data-page') || '1', 10);
          if (page !== this.currentPage) {
            this.currentPage = page;
            this.cdr.detectChanges();
          }
          break;
        }
      }
    }, 100);
  }

  // ===== 缩放 =====
  zoomIn(): void {
    if (this.scale >= 3) return;
    this.scale = Math.min(3, this.scale + 0.25);
    this.renderAllPages();
    this.cdr.detectChanges();
  }

  zoomOut(): void {
    if (this.scale <= 0.5) return;
    this.scale = Math.max(0.5, this.scale - 0.25);
    this.renderAllPages();
    this.cdr.detectChanges();
  }
}
