import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { WikiService, WikiDocument } from '../../../services/wiki.service';
import { NavbarComponent } from '../../../components/navbar/navbar.component';

@Component({
  selector: 'app-wiki-list',
  standalone: true,
  imports: [NavbarComponent, DatePipe],
  templateUrl: './wiki-list.component.html',
  styleUrl: './wiki-list.component.css',
})
export class WikiListComponent implements OnInit {
  documents = signal<WikiDocument[]>([]);
  isLoading = signal(false);

  constructor(
    private wikiService: WikiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    this.wikiService.getDocuments().subscribe({
      next: (data) => {
        this.documents.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createDocument(): void {
    this.wikiService.createDocument('无标题文档', '').subscribe({
      next: (doc) => this.router.navigate(['/wiki', doc.id]),
      error: (err) => console.error('创建文档失败:', err),
    });
  }

  openDocument(id: string): void {
    this.router.navigate(['/wiki', id]);
  }

  deleteDocument(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('确认删除该文档？')) return;
    this.wikiService.deleteDocument(id).subscribe({
      next: () => this.loadDocuments(),
      error: (err) => console.error('删除失败:', err),
    });
  }
}
