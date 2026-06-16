import { Component } from '@angular/core';
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

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }

  isAdmin(user: UserInfo | null): boolean {
    return user?.role === 'admin';
  }
}
