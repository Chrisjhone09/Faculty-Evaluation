import { Component } from '@angular/core';
import { AppShell, AppShellNavGroup } from '../../../shared/components/app-shell/app-shell';

/**
 * Dean navigation. Reports was folded into the Dashboard (both rendered the
 * same endpoint's DTO), and Offerings + Requests became one Classes
 * workspace - five entries down to three.
 */
@Component({
  selector: 'app-dean-shell',
  imports: [AppShell],
  templateUrl: './dean-shell.html',
})
export class DeanShell {
  protected readonly navGroups: AppShellNavGroup[] = [
    {
      items: [
        { label: 'Dashboard', path: '/dean/dashboard', icon: 'dashboard' },
        { label: 'Classes', path: '/dean/classes', icon: 'book' },
        { label: 'Faculty', path: '/dean/faculty', icon: 'star' },
      ],
    },
  ];
}
