import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../../../core/config/api-config';
import { Icon } from '../../../shared/components/icon/icon';

interface Settings {
  minimumRespondents: number; minimumCommentRespondents: number;
  respondentThresholdMode: string; respondentPercentage: number;
  commentThresholdMode: string; commentPercentage: number;
  neutralScoreMinimum: number; positiveScoreMinimum: number; applyToActivePeriod: boolean;
}
@Component({
  selector: 'app-evaluation-settings', imports: [ReactiveFormsModule, Icon],
  templateUrl: './evaluation-settings.html', styleUrl: './evaluation-settings.css',
})
export class EvaluationSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/evaluation-settings`;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    minimumRespondents: [5, [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)]],
    minimumCommentRespondents: [5, [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)]],
    respondentThresholdMode: ['Count', Validators.required],
    respondentPercentage: [50, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    commentThresholdMode: ['Count', Validators.required],
    commentPercentage: [30, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    neutralScoreMinimum: [50, [Validators.required, Validators.min(0.01), Validators.max(99.99)]],
    positiveScoreMinimum: [75, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    applyToActivePeriod: [true],
  });
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal('');
  protected requiredExample(population: number, percentage: number): number { return Math.max(1, Math.ceil(population * percentage / 100)); }
  ngOnInit(): void { this.http.get<Settings>(this.url).subscribe({
    next: s => { this.form.patchValue({ ...s, applyToActivePeriod: true }); this.loading.set(false); },
    error: () => { this.loading.set(false); this.loadFailed.set(true); this.error.set('Could not load settings. Refresh to try again.'); },
  }); }
  protected save(): void {
    this.error.set(''); this.saved.set('');
    if (this.form.invalid || this.busy() || this.loadFailed()) { this.form.markAllAsTouched(); return; }
    const request = this.form.getRawValue();
    if (request.neutralScoreMinimum >= request.positiveScoreMinimum) {
      this.error.set('Neutral minimum must be lower than Positive minimum.'); return;
    }
    this.busy.set(true);
    this.http.put<Settings>(this.url, request).subscribe({
      next: () => { this.busy.set(false); this.saved.set(request.applyToActivePeriod
        ? 'Saved for the active period and future periods. Closed periods keep their original rules.'
        : 'Saved for future periods. The active period keeps its current rules.'); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(Object.values(e.error?.errors ?? {}).flat().join(' ') || e.error?.detail || e.error?.Detail || 'Could not save settings.'); },
    });
  }
}
