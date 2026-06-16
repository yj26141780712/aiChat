import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = signal('');
  confirmPassword = signal('');
  error = signal('');
  success = signal('');
  isLoading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('无效的重置链接');
    }
  }

  onSubmit(): void {
    if (this.newPassword() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.resetPassword(this.token, this.newPassword()).subscribe({
      next: (res) => {
        this.success.set(res.message || '密码重置成功');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error.set(err.error?.message || '重置失败');
        this.isLoading.set(false);
      },
    });
  }
}
