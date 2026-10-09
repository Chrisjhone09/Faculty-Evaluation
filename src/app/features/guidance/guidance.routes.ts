import { Routes } from '@angular/router';
import { GuidanceShell } from './shell/guidance-shell';
import { redirectToTab, redirectWithParam } from '../../core/routing/redirects';

/** Guidance combines analytics and shared management screens in one workspace. */
export const GUIDANCE_ROUTES: Routes = [
  {
    path: '',
    component: GuidanceShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/guidance-dashboard').then((m) => m.GuidanceDashboard),
      },
      {
        path: 'faculty',
        pathMatch: 'full',
        loadComponent: () =>
          import('./faculty-performance/guidance-faculty-performance').then((m) => m.GuidanceFacultyPerformance),
      },
      {
        path: 'faculty/:instructorId',
        loadComponent: () =>
          import('./faculty-performance/detail/guidance-faculty-performance-detail').then(
            (m) => m.GuidanceFacultyPerformanceDetail,
          ),
      },
      {
        path: 'comments',
        loadComponent: () => import('./comments/guidance-comments').then((m) => m.GuidanceComments),
      },

      { path: 'users', loadComponent: () => import('../admin/users/admin-users').then(m => m.AdminUsers) },
      { path: 'student-masterlist', loadComponent: () => import('./student-masterlist/student-masterlist').then(m => m.StudentMasterlist) },
      { path: 'academics', loadComponent: () => import('../admin/academics/admin-academics').then(m => m.AdminAcademics) },
      { path: 'evaluations', loadComponent: () => import('../admin/evaluations/admin-evaluations').then(m => m.AdminEvaluations) },
      { path: 'evaluations/forms/:id', loadComponent: () => import('../admin/evaluation-forms/detail/admin-evaluation-form-detail').then(m => m.AdminEvaluationFormDetail) },
      { path: 'rosters', loadComponent: () => import('./rosters/guidance-rosters').then(m => m.GuidanceRosters) },
      { path: 'rosters/:id', loadComponent: () => import('../dean/classes/detail/dean-class-detail').then(m => m.DeanClassDetail) },

      // --- Legacy paths ---------------------------------------------------
      { path: 'classes', pathMatch: 'full', redirectTo: 'rosters' },
      { path: 'classes/:id', redirectTo: redirectWithParam('/guidance/rosters', 'id') },
      { path: 'flagged-faculty', redirectTo: redirectToTab('/guidance/faculty', 'flagged') },
      { path: 'faculty-performance', pathMatch: 'full', redirectTo: 'faculty' },
      {
        path: 'faculty-performance/:instructorId',
        redirectTo: redirectWithParam('/guidance/faculty', 'instructorId'),
      },
    ],
  },
];

export default GUIDANCE_ROUTES;
