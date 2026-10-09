import { Component } from '@angular/core';
import { AppShell, AppShellNavGroup } from '../../../shared/components/app-shell/app-shell';

/**
 * Admin navigation. Nine flat entries became four grouped ones: the four
 * master-data screens live behind Academic Structure, and the two
 * questionnaire screens behind Evaluations.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [AppShell],
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  protected readonly navGroups: AppShellNavGroup[] = [
    {
      items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' }],
    },
    {
      label: 'Manage',
      items: [
        { label: 'Users', path: '/admin/users', icon: 'users' },
        { label: 'Academic Structure', path: '/admin/academics', icon: 'building' },
        { label: 'Evaluations', path: '/admin/evaluations', icon: 'clipboard' },
      ],
    },
    {
      label: 'System',
      items: [{ label: 'Audit Logs', icon: 'layers', comingSoon: true }],
    },
  ];
}
