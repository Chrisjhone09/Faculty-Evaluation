import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { InstructorClasses } from './instructor-classes';
import { InstructorClassRequests } from '../class-requests/instructor-class-requests';

type ClassesTab = 'classes' | 'requests';

const TABS: { id: ClassesTab; label: string }[] = [
  { id: 'classes', label: 'My Classes' },
  { id: 'requests', label: 'Requests' },
];

/**
 * Classes workspace for the Instructor - the same pipeline framing as the
 * Dean's: you request a class, and once approved it appears in My Classes.
 */
@Component({
  selector: 'app-instructor-classes-workspace',
  imports: [PageHeader, InstructorClasses, InstructorClassRequests],
  template: `
    <app-page-header
      title="Classes"
      description="Classes you're assigned to teach, and the requests you've submitted to your Dean."
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
      @case ('classes') { <app-instructor-classes /> }
      @case ('requests') { <app-instructor-class-requests /> }
    }
  `,
})
export class InstructorClassesWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  private readonly queryTab = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed<ClassesTab>(() => {
    const requested = this.queryTab().get('tab') as ClassesTab | null;
    return TABS.some((t) => t.id === requested) ? requested! : 'classes';
  });

  protected selectTab(tab: ClassesTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
}
