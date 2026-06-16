import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal('');

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      this.message.set('无效的验证链接');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.status.set('success');
        this.message.set(res.message || '邮箱验证成功');
      },
      error: (err) => {
        this.status.set('error');
        this.message.set(err.error?.message || '验证失败');
      },
    });
  }
}
