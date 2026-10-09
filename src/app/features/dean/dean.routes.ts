import { Routes } from '@angular/router';
import { DeanShell } from './shell/dean-shell';
import { redirectToTab, redirectWithParam } from '../../core/routing/redirects';

/**
 * Dean navigation went from five entries to three.
 *
 * Reports was removed outright: it called the same `/api/dean/reports`
 * endpoint as the Dashboard and rendered a superset of the same DTO, so the
 * two pages were the same data twice. Everything Reports showed now lives on
 * the Dashboard, and /dean/reports redirects there.
 *
 * Offerings and Requests became one Classes workspace, since a request
 * becomes an offering when approved.
 */
export const DEAN_ROUTES: Routes = [
  {
    path: '',
    component: DeanShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dean-dashboard').then((m) => m.DeanDashboard),
      },
      {
        path: 'classes',
        pathMatch: 'full',
        loadComponent: () => import('./classes/dean-classes-workspace').then((m) => m.DeanClassesWorkspace),
      },
      {
        path: 'classes/:id',
        loadComponent: () => import('./classes/detail/dean-class-detail').then((m) => m.DeanClassDetail),
      },
      {
        path: 'faculty',
        pathMatch: 'full',
        loadComponent: () =>
          import('./faculty-performance/dean-faculty-performance').then((m) => m.DeanFacultyPerformance),
      },
      {
        path: 'faculty/:instructorId',
        loadComponent: () =>
          import('./faculty-performance/detail/dean-faculty-performance-detail').then(
            (m) => m.DeanFacultyPerformanceDetail,
          ),
      },

      // --- Legacy paths ---------------------------------------------------
      { path: 'reports', redirectTo: 'dashboard' },
      { path: 'class-requests', redirectTo: redirectToTab('/dean/classes', 'requests') },
      { path: 'faculty-performance', pathMatch: 'full', redirectTo: 'faculty' },
      { path: 'faculty-performance/:instructorId', redirectTo: redirectWithParam('/dean/faculty', 'instructorId') },
    ],
  },
];

export default DEAN_ROUTES;
