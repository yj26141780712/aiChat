import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { environment } from '../../../../environments/environment';

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [NavbarComponent, DatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  users = signal<UserItem[]>([]);
  isLoading = signal(false);

  private baseUrl = `${environment.apiBase}/admin/users`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.http.get<UserItem[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  toggleStatus(user: UserItem): void {
    this.http.delete<any>(`${this.baseUrl}/${user.id}`).subscribe({
      next: () => this.loadUsers(),
    });
  }

  changeRole(user: UserItem): void {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    this.http.patch<any>(`${this.baseUrl}/${user.id}/role`, { role: newRole }).subscribe({
      next: () => this.loadUsers(),
    });
  }
}
