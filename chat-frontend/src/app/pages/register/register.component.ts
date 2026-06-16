import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  email = signal('');
  username = signal('');
  password = signal('');
  confirmPassword = signal('');
  invitationCode = signal('');
  error = signal('');
  success = signal('');
  isLoading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.email() || !this.username() || !this.password() || !this.invitationCode()) {
      this.error.set('请填写所有字段');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.register(this.email(), this.password(), this.username(), this.invitationCode()).subscribe({
      next: (res) => {
        this.success.set(res.message || '注册成功！请查收验证邮件');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '注册失败');
        this.isLoading.set(false);
      },
    });
  }
}
