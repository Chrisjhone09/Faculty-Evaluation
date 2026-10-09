import { Component } from '@angular/core';
import { AppShell, AppShellNavGroup } from '../../../shared/components/app-shell/app-shell';

/**
 * Instructor navigation. My Classes and Class Requests became one Classes
 * workspace with two tabs.
 */
@Component({
  selector: 'app-instructor-shell',
  imports: [AppShell],
  templateUrl: './instructor-shell.html',
})
export class InstructorShell {
  protected readonly navGroups: AppShellNavGroup[] = [
    {
      items: [
        { label: 'Dashboard', path: '/instructor/dashboard', icon: 'dashboard' },
        { label: 'Classes', path: '/instructor/classes', icon: 'book' },
        { label: 'My Results', icon: 'chart', comingSoon: true },
      ],
    },
  ];
}
