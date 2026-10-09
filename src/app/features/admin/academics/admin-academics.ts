import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { AdminDepartments } from '../departments/admin-departments';
import { AdminSubjects } from '../subjects/admin-subjects';
import { AdminSections } from '../sections/admin-sections';
import { AdminInstructors } from '../instructors/admin-instructors';

type AcademicsTab = 'departments' | 'subjects' | 'sections' | 'instructors';

const TABS: { id: AcademicsTab; label: string }[] = [
  { id: 'departments', label: 'Departments' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'sections', label: 'Sections' },
  { id: 'instructors', label: 'Instructors' },
];

/**
 * Academic structure workspace.
 *
 * Departments, Subjects, Sections and Instructors were four separate
 * top-level nav entries, but they're one job: maintaining the master data a
 * Dean needs before they can create a class offering. They're also almost
 * always edited in the same sitting. Grouping them into a tabbed workspace
 * takes Admin's sidebar from nine entries to four without hiding anything.
 *
 * The active tab lives in `?tab=` so it's linkable, survives a refresh, and
 * works with the browser back button - a plain signal wouldn't do any of that.
 */
@Component({
  selector: 'app-admin-academics',
  imports: [PageHeader, AdminDepartments, AdminSubjects, AdminSections, AdminInstructors],
  template: `
    <app-page-header
      title="Academic Structure"

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

    <!-- Rendered rather than hidden, so each tab loads its data only when
         opened and doesn't hold stale state in the background. -->
    @switch (activeTab()) {
      @case ('departments') { <app-admin-departments /> }
      @case ('subjects') { <app-admin-subjects /> }
      @case ('sections') { <app-admin-sections /> }
      @case ('instructors') { <app-admin-instructors /> }
    }
  `,
})
export class AdminAcademics {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  private readonly queryTab = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed<AcademicsTab>(() => {
    const requested = this.queryTab().get('tab') as AcademicsTab | null;
    return TABS.some((t) => t.id === requested) ? requested! : 'departments';
  });

  protected selectTab(tab: AcademicsTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      replaceUrl: true,
    });
  }
}
