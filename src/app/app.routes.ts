import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppRoles } from './core/models/auth.models';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'student/login' },
  { path: 'login', redirectTo: 'student/login' },
  { path: 'register', redirectTo: 'student/login' },
  { path: 'student/login', loadComponent: () => import('./features/auth/student-login/student-login').then(m => m.StudentLogin) },
  { path: 'guidance/login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'unauthorized', loadComponent: () => import('./shared/components/unauthorized/unauthorized').then(m => m.Unauthorized) },
  { path: 'student', canActivate: [authGuard, roleGuard([AppRoles.Student])], loadChildren: () => import('./features/student/student.routes') },
  { path: 'guidance', canActivate: [authGuard, roleGuard([AppRoles.Guidance])], loadChildren: () => import('./features/guidance/guidance.routes') },
  { path: '**', redirectTo: 'student/login' },
];
