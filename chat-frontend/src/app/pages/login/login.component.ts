import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  error = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (!this.email() || !this.password()) {
      this.error.set('请填写邮箱和密码');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.login(this.email(), this.password()).subscribe({
      next: () => {
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error.set(err.error?.message || '登录失败');
        this.isLoading.set(false);
      },
    });
  }
}
