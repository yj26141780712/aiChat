import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { environment } from '../../../../environments/environment';

interface InvitationCodeItem {
  id: string;
  code: string;
  type: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdBy: { username: string };
  usedById: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-invitation-codes',
  standalone: true,
  imports: [NavbarComponent, DatePipe, FormsModule],
  templateUrl: './invitation-codes.component.html',
  styleUrl: './invitation-codes.component.css',
})
export class InvitationCodesComponent implements OnInit {
  codes = signal<InvitationCodeItem[]>([]);
  isLoading = signal(false);

  // 创建表单
  codeType = signal('once');
  maxUses = signal(0);
  customCode = signal('');
  batchCount = signal(1);
  expiresAt = signal('');

  private baseUrl = `${environment.apiBase}/admin/invitation-codes`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCodes();
  }

  loadCodes(): void {
    this.isLoading.set(true);
    this.http.get<InvitationCodeItem[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.codes.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createCode(): void {
    const body: any = {
      type: this.codeType(),
      maxUses: this.codeType() === 'multiple' ? this.maxUses() : 0,
      count: this.batchCount(),
    };
    if (this.customCode().trim()) {
      body.customCode = this.customCode().trim();
      body.count = 1;
    }
    if (this.expiresAt()) {
      body.expiresAt = this.expiresAt();
    }

    this.http.post(this.baseUrl, body).subscribe({
      next: () => {
        this.loadCodes();
        this.customCode.set('');
      },
      error: (err) => alert(err.error?.message || '创建失败'),
    });
  }

  toggleStatus(code: InvitationCodeItem): void {
    this.http.patch(`${this.baseUrl}/${code.id}/toggle`, {}).subscribe({
      next: () => this.loadCodes(),
    });
  }

  deleteCode(code: InvitationCodeItem): void {
    if (!confirm(`确认删除邀请码 "${code.code}"？`)) return;
    this.http.delete(`${this.baseUrl}/${code.id}`).subscribe({
      next: () => this.loadCodes(),
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
  }
}
