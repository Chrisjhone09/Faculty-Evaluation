import { Component } from '@angular/core';
import { AppShell, AppShellNavGroup } from '../../../shared/components/app-shell/app-shell';

/**
 * Student navigation. The former "My Classes" and "Evaluation History"
 * placeholders were removed rather than left as dead "Soon" entries - the
 * dashboard's own Pending/Completed split already answers both questions
 * ("what do I owe" and "what have I done"), so they were duplicate
 * destinations for information the student already has.
 */
@Component({
  selector: 'app-student-shell',
  imports: [AppShell],
  templateUrl: './student-shell.html',
})
export class StudentShell {
  protected readonly navGroups: AppShellNavGroup[] = [
    {
      items: [{ label: 'My Evaluations', path: '/student/dashboard', icon: 'clipboard' }],
    },
  ];
}
