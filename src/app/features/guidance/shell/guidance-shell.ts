import { Component } from '@angular/core';
import { AppShell, AppShellNavGroup } from '../../../shared/components/app-shell/app-shell';

/** Guidance navigation groups reporting and system management. */
@Component({
  selector: 'app-guidance-shell',
  imports: [AppShell],
  templateUrl: './guidance-shell.html',
})
export class GuidanceShell {
  protected readonly navGroups: AppShellNavGroup[] = [
    {
      label: 'Insights',
      items: [
        { label: 'Overview', path: '/guidance/dashboard', icon: 'dashboard' },
        { label: 'Faculty', path: '/guidance/faculty', icon: 'star' },
        { label: 'Comments', path: '/guidance/comments', icon: 'message' },
      ],
    },
    {
      label: 'Management',
      items: [
        { label: 'Users & Access', path: '/guidance/users', icon: 'users' },
        { label: 'Student Master List', path: '/guidance/student-masterlist', icon: 'clipboard' },
        { label: 'Academic Structure', path: '/guidance/academics', icon: 'building' },
        { label: 'Subjects & Rosters', path: '/guidance/rosters', icon: 'graduation' },
        { label: 'Evaluations', path: '/guidance/evaluations', icon: 'clipboard' },
      ],
    },
  ];
}
