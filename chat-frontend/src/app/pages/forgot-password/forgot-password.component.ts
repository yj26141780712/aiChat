import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  email = signal('');
  error = signal('');
  success = signal('');
  isLoading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.email()) {
      this.error.set('请输入邮箱');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.forgotPassword(this.email()).subscribe({
      next: (res) => {
        this.success.set(res.message || '重置链接已发送');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '发送失败');
        this.isLoading.set(false);
      },
    });
  }
}
