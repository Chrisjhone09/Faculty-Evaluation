import { Routes } from '@angular/router';
import { AdminShell } from './shell/admin-shell';
import { redirectToTab, redirectWithParam } from '../../core/routing/redirects';

/**
 * Admin navigation went from nine top-level entries to four by grouping the
 * master-data screens into an Academics workspace and the questionnaire
 * screens into an Evaluations workspace.
 *
 * The old paths are kept as redirects so existing links and bookmarks land
 * on the right tab instead of 404ing.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/admin-users').then((m) => m.AdminUsers),
      },

      // --- Workspaces -----------------------------------------------------
      {
        path: 'academics',
        loadComponent: () => import('./academics/admin-academics').then((m) => m.AdminAcademics),
      },
      {
        path: 'evaluations',
        loadComponent: () => import('./evaluations/admin-evaluations').then((m) => m.AdminEvaluations),
      },
      {
        path: 'evaluations/forms/:id',
        loadComponent: () =>
          import('./evaluation-forms/detail/admin-evaluation-form-detail').then((m) => m.AdminEvaluationFormDetail),
      },

      // --- Legacy paths ---------------------------------------------------
      { path: 'departments', redirectTo: redirectToTab('/admin/academics', 'departments') },
      { path: 'subjects', redirectTo: redirectToTab('/admin/academics', 'subjects') },
      { path: 'sections', redirectTo: redirectToTab('/admin/academics', 'sections') },
      { path: 'instructors', redirectTo: redirectToTab('/admin/academics', 'instructors') },
      { path: 'evaluation-forms', pathMatch: 'full', redirectTo: redirectToTab('/admin/evaluations', 'forms') },
      { path: 'evaluation-forms/:id', redirectTo: redirectWithParam('/admin/evaluations/forms', 'id') },
      { path: 'evaluation-periods', redirectTo: redirectToTab('/admin/evaluations', 'periods') },
    ],
  },
];

export default ADMIN_ROUTES;
