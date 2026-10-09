import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppRoles } from './core/models/auth.models';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./shared/components/unauthorized/unauthorized').then((m) => m.Unauthorized),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard([AppRoles.Admin])],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: 'dean',
    canActivate: [authGuard, roleGuard([AppRoles.Dean])],
    loadChildren: () => import('./features/dean/dean.routes'),
  },
  {
    path: 'instructor',
    canActivate: [authGuard, roleGuard([AppRoles.Instructor])],
    loadChildren: () => import('./features/instructor/instructor.routes'),
  },
  {
    path: 'student',
    canActivate: [authGuard, roleGuard([AppRoles.Student])],
    loadChildren: () => import('./features/student/student.routes'),
  },
  {
    path: 'guidance',
    canActivate: [authGuard, roleGuard([AppRoles.Guidance])],
    loadChildren: () => import('./features/guidance/guidance.routes'),
  },
  { path: '**', redirectTo: 'login' },
];
