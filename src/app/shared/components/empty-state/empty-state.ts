import { Component, Input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * Consistent empty state: icon, title, explanation, and an optional action
 * slot. Used instead of a bare "No data" paragraph so every empty list in
 * the app explains itself and offers the next step.
 */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  template: `
    <div class="empty-state">
      @if (icon) {
        <div class="empty-state-icon"><app-icon [name]="icon" size="lg" /></div>
      }
      @if (title) {
        <div class="empty-state-title">{{ title }}</div>
      }
      <div class="empty-state-body">
        {{ message }}
        <ng-content select="[slot=body]" />
      </div>
      <div class="empty-state-actions"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  @Input() icon?: IconName = 'inbox';
  @Input() title?: string;
  @Input() message = '';
}
