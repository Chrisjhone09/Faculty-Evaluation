import { Routes } from '@angular/router';
import { StudentShell } from './shell/student-shell';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    component: StudentShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/student-dashboard').then((m) => m.StudentDashboard),
      },
      {
        path: 'evaluate/:classMembershipId',
        loadComponent: () => import('./evaluate/student-evaluate').then((m) => m.StudentEvaluate),
      },
    ],
  },
];

export default STUDENT_ROUTES;
