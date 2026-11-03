import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../../../core/config/api-config';
import { Icon } from '../../../shared/components/icon/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';

interface Settings { minimumRespondents: number; minimumCommentRespondents: number; }
@Component({
  selector: 'app-evaluation-settings', imports: [ReactiveFormsModule, Icon, PageHeader],
  template: `<app-page-header title="Evaluation Settings" />
    @if (loading()) { <p class="loading-row">Loading...</p> }
    @else { <form [formGroup]="form" (ngSubmit)="save()" class="settings-form">
      <h2>Reliability thresholds</h2>
      <div class="form-field"><label for="minimum-respondents">Minimum respondents</label>
        <input id="minimum-respondents" type="number" min="1" max="10000" formControlName="minimumRespondents" /></div>
      <div class="form-field"><label for="minimum-comments">Minimum written-feedback contributors</label>
        <input id="minimum-comments" type="number" min="1" max="10000" formControlName="minimumCommentRespondents" /></div>
      @if (form.invalid && form.touched) { <p class="field-error">Enter whole numbers from 1 to 10,000.</p> }
      @if (error()) { <div class="banner-error" role="alert">{{ error() }}</div> }
      @if (saved()) { <div class="banner-success" role="status">Saved for future evaluation periods.</div> }
      <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="busy()"><app-icon name="check" /> {{ busy() ? 'Saving...' : 'Save settings' }}</button></div>
    </form> }`,
  styles: ['.settings-form { max-width: 520px; } h2 { font-size: 20px; }'],
})
export class EvaluationSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/evaluation-settings`;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    minimumRespondents: [5, [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)]],
    minimumCommentRespondents: [5, [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)]],
  });
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);
  ngOnInit(): void { this.http.get<Settings>(this.url).subscribe({
    next: s => { this.form.setValue(s); this.loading.set(false); },
    error: () => { this.loading.set(false); this.error.set('Could not load settings.'); },
  }); }
  protected save(): void {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set(''); this.saved.set(false);
    this.http.put<Settings>(this.url, this.form.getRawValue()).subscribe({
      next: () => { this.busy.set(false); this.saved.set(true); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.error?.detail ?? 'Could not save settings.'); },
    });
  }
}
