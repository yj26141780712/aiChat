import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'chat',
    loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/invitation-codes',
    loadComponent: () => import('./pages/admin/invitation-codes/invitation-codes.component').then(m => m.InvitationCodesComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'wiki',
    loadComponent: () => import('./pages/wiki/wiki-list/wiki-list.component').then(m => m.WikiListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'wiki/:id',
    loadComponent: () => import('./pages/wiki/wiki-editor/wiki-editor.component').then(m => m.WikiEditorComponent),
    canActivate: [authGuard],
  },
  {
    path: 'knowledge',
    loadComponent: () => import('./pages/knowledge/knowledge.component').then(m => m.KnowledgeComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'chat',
  },
];
