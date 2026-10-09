import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { DeanClasses } from './dean-classes';
import { DeanClassRequests } from '../class-requests/dean-class-requests';

type ClassesTab = 'offerings' | 'requests';

const TABS: { id: ClassesTab; label: string }[] = [
  { id: 'offerings', label: 'Offerings' },
  { id: 'requests', label: 'Requests' },
];

/**
 * Classes workspace for the Dean.
 *
 * A class request becomes a class offering when approved, so the two lists
 * are stages of one pipeline. Keeping them as sibling nav entries meant
 * bouncing between pages to approve a request and then check the offering it
 * created; as tabs, that's one click.
 */
@Component({
  selector: 'app-dean-classes-workspace',
  imports: [PageHeader, DeanClasses, DeanClassRequests],
  template: `
    <app-page-header
      title="Classes"
      description="Class offerings in your department, and the instructor requests waiting to become one."
    />

    <div class="tabs" role="tablist">
      @for (tab of tabs; track tab.id) {
        <button
          type="button"
          class="tab"
          role="tab"
          [class.active]="activeTab() === tab.id"
          [attr.aria-selected]="activeTab() === tab.id"
          (click)="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>

    @switch (activeTab()) {
      @case ('offerings') { <app-dean-classes /> }
      @case ('requests') { <app-dean-class-requests /> }
    }
  `,
})
export class DeanClassesWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  private readonly queryTab = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed<ClassesTab>(() => {
    const requested = this.queryTab().get('tab') as ClassesTab | null;
    return TABS.some((t) => t.id === requested) ? requested! : 'offerings';
  });

  protected selectTab(tab: ClassesTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
}
