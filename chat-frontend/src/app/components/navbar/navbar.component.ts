import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  currentUser$;
  menuOpen = signal(false);

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  isAdmin(user: UserInfo | null): boolean {
    return user?.role === 'admin';
  }
}
