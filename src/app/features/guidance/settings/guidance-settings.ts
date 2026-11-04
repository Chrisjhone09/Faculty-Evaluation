import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { EvaluationSettings } from '../evaluation-settings/evaluation-settings';
import { AiSettings } from '../ai-settings/ai-settings';
import { AccountSettings } from '../account-settings/account-settings';

@Component({
  selector: 'app-guidance-settings', imports: [RouterLink, PageHeader, EvaluationSettings, AiSettings, AccountSettings],
  template: `<app-page-header title="Settings" />
    <p class="settings-intro">Manage evaluation rules, AI connection and budget, and your Guidance account in one place.</p>
    <nav class="settings-tabs" aria-label="Settings sections">
      <a [routerLink]="[]" [queryParams]="{tab: 'evaluation'}" [class.active]="evaluationTab()" [attr.aria-current]="evaluationTab() ? 'page' : null">Evaluation</a>
      <a [routerLink]="[]" [queryParams]="{tab: 'ai'}" [class.active]="aiTab()" [attr.aria-current]="aiTab() ? 'page' : null">AI &amp; budget</a>
      <a [routerLink]="[]" [queryParams]="{tab: 'account'}" [class.active]="accountTab()" [attr.aria-current]="accountTab() ? 'page' : null">Account</a>
    </nav>
    @if (aiTab()) { <app-ai-settings /> } @else if (accountTab()) { <app-account-settings /> } @else { <app-evaluation-settings /> }`,
  styles: [`.settings-intro { color: var(--color-text-secondary); margin-bottom: 28px; } .settings-tabs { display: flex; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 14px; margin-bottom: 32px; } .settings-tabs a { padding: 12px 20px; border-radius: var(--radius-md); font-weight: 600; color: var(--color-text-secondary); text-decoration: none; } .settings-tabs a.active { color: var(--color-primary); background: var(--color-primary-subtle); }`],
})
export class GuidanceSettings {
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly aiTab = computed(() => this.query()?.get('tab') === 'ai');
  protected readonly accountTab = computed(() => this.query()?.get('tab') === 'account');
  protected readonly evaluationTab = computed(() => !this.aiTab() && !this.accountTab());
}
