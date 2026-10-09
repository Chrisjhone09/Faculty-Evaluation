import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { AdminEvaluationForms } from '../evaluation-forms/admin-evaluation-forms';
import { AdminEvaluationPeriods } from '../evaluation-periods/admin-evaluation-periods';

type EvaluationsTab = 'forms' | 'periods';

const TABS: { id: EvaluationsTab; label: string }[] = [
  { id: 'forms', label: 'Forms' },
  { id: 'periods', label: 'Periods' },
];

/**
 * Evaluation setup workspace.
 *
 * A period is meaningless without a form and a form does nothing until a
 * period points at it, so configuring one almost always means checking the
 * other. Two nav entries became one workspace with two tabs.
 *
 * Form editing stays a real route (/admin/evaluations/forms/:id) rather than
 * a tab or drawer - it's a deep nested editor for categories and questions,
 * which needs the full width and its own URL.
 */
@Component({
  selector: 'app-admin-evaluations',
  imports: [PageHeader, AdminEvaluationForms, AdminEvaluationPeriods],
  template: `
    <app-page-header
      title="Evaluations"

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
      @case ('forms') { <app-admin-evaluation-forms /> }
      @case ('periods') { <app-admin-evaluation-periods /> }
    }
  `,
})
export class AdminEvaluations {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  private readonly queryTab = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed<EvaluationsTab>(() => {
    const requested = this.queryTab().get('tab') as EvaluationsTab | null;
    return TABS.some((t) => t.id === requested) ? requested! : 'forms';
  });

  protected selectTab(tab: EvaluationsTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
}
