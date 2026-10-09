import { Routes } from '@angular/router';
import { InstructorShell } from './shell/instructor-shell';
import { redirectToTab } from '../../core/routing/redirects';

/**
 * Instructor navigation went from four entries to two: My Classes and Class
 * Requests became one Classes workspace, matching the Dean's framing of the
 * same pipeline.
 */
export const INSTRUCTOR_ROUTES: Routes = [
  {
    path: '',
    component: InstructorShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/instructor-dashboard').then((m) => m.InstructorDashboard),
      },
      {
        path: 'classes',
        pathMatch: 'full',
        loadComponent: () =>
          import('./classes/instructor-classes-workspace').then((m) => m.InstructorClassesWorkspace),
      },
      {
        path: 'classes/:id',
        loadComponent: () => import('./classes/detail/instructor-class-detail').then((m) => m.InstructorClassDetail),
      },

      // --- Legacy paths ---------------------------------------------------
      { path: 'class-requests', redirectTo: redirectToTab('/instructor/classes', 'requests') },
    ],
  },
];

export default INSTRUCTOR_ROUTES;
