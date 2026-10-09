import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * Standard page heading: optional back link, title, description, and a slot
 * for right-aligned actions. Every page uses this so headers align and
 * measure identically across roles.
 *
 * Usage:
 *   <app-page-header title="Users" description="Accounts and roles">
 *     <button class="btn btn-primary">New user</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Icon],
  template: `
    @if (backLink) {
      <a class="back-link" [routerLink]="backLink">
        <app-icon name="arrow-left" size="sm" />
        {{ backLabel }}
      </a>
    }

    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">
          <ng-content select="[slot=title]" />
          {{ title }}
        </h1>
        @if (description) {
          <p class="page-description">{{ description }}</p>
        }
        <ng-content select="[slot=meta]" />
      </div>

      <div class="page-header-actions">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeader {
  @Input() title = '';
  @Input() description?: string;
  /** Absolute route to return to. Renders a back affordance above the title. */
  @Input() backLink?: string;
  @Input() backLabel = 'Back';
}
