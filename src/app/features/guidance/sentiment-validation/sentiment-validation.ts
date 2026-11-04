import { DatePipe, PercentPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '../../../shared/components/icon/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ReportPeriod } from '../shared/report-period';
import { Pagination } from '../../../shared/tables/table-parts';
import { createTableState } from '../../../shared/tables/table-state';
import { Sentiment, SentimentValidationService, ValidationBatch, ValidationDetail } from './sentiment-validation.service';

@Component({
  selector: 'app-sentiment-validation',
  imports: [DatePipe, PercentPipe, ReactiveFormsModule, Icon, PageHeader, ReportPeriod, Pagination],
  templateUrl: './sentiment-validation.html', styleUrl: './sentiment-validation.css',
})
export class SentimentValidation {
  private readonly service = inject(SentimentValidationService);
  protected readonly periodId = signal<string | undefined>(undefined);
  protected readonly batches = signal<ValidationBatch[]>([]);
  protected readonly batchTable = createTableState(this.batches, {
    searchFields: batch => [batch.name, batch.periodName],
    initialSort: { key: 'createdAtUtc', direction: 'desc' },
    pageSize: 50,
  });
  protected readonly detail = signal<ValidationDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly labels = signal<Record<string, Sentiment | 'Excluded'>>({});
  protected readonly dirty = signal(false);
  protected readonly page = signal(0);
  protected readonly sentiments: Sentiment[] = ['Positive', 'Neutral', 'Negative'];
  protected readonly pageItems = computed(() => this.detail()?.items.slice(this.page() * 10, this.page() * 10 + 10) ?? []);
  protected readonly pageCount = computed(() => Math.ceil((this.detail()?.items.length ?? 0) / 10));
  protected readonly labeledCount = computed(() => Object.keys(this.labels()).length);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    sampleSize: [100, [Validators.required, Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)]],
  });
  private listRequest?: import('rxjs').Subscription;

  protected loadPeriod(id: string | undefined): void {
    this.periodId.set(id); this.error.set(''); this.busy.set(true);
    this.listRequest?.unsubscribe();
    this.listRequest = this.service.list(id).subscribe({
      next: rows => { this.batches.set(rows); this.busy.set(false); }, error: e => this.fail(e),
    });
  }
  protected create(): void {
    if (this.busy() || this.form.invalid || !this.periodId()) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set(''); this.message.set('');
    const value = this.form.getRawValue();
    this.service.create(this.periodId()!, value.name, value.sampleSize).subscribe({
      next: d => { this.show(d); this.busy.set(false); }, error: e => this.fail(e),
    });
  }
  protected open(id: string): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.service.get(id).subscribe({ next: d => { this.show(d); this.busy.set(false); }, error: e => this.fail(e) });
  }
  protected deleteBatch(batch: ValidationBatch): void {
    if (this.busy() || !window.confirm(`Delete the validation batch “${batch.name}”? Its saved labels and metrics will be removed.`)) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.service.delete(batch.id).subscribe({
      next: () => {
        this.batches.update(rows => rows.filter(row => row.id !== batch.id));
        this.busy.set(false); this.message.set('Validation batch deleted. Its comments can be reviewed in a future batch.');
      },
      error: e => this.fail(e),
    });
  }
  private show(d: ValidationDetail): void {
    this.detail.set(d); this.page.set(0); this.dirty.set(false);
    this.labels.set(Object.fromEntries(d.items.filter(i => i.humanSentiment || i.isExcluded).map(i => [i.id, i.isExcluded ? 'Excluded' : i.humanSentiment!])));
  }
  protected label(id: string, sentiment: Sentiment | 'Excluded'): void {
    this.labels.update(values => ({ ...values, [id]: sentiment })); this.dirty.set(true); this.message.set('');
  }
  protected save(): void {
    const d = this.detail();
    if (!d || this.busy() || !this.labeledCount()) return;
    this.busy.set(true); this.error.set('');
    this.service.save(d.id, Object.entries(this.labels()).map(([itemId, sentiment]) => ({ itemId,
      sentiment: sentiment === 'Excluded' ? null : sentiment, isExcluded: sentiment === 'Excluded' }))).subscribe({
      next: result => { this.detail.set(result); this.dirty.set(false); this.busy.set(false); this.message.set('Labels saved.'); }, error: e => this.fail(e),
    });
  }
  protected complete(): void {
    const d = this.detail();
    if (!d || this.busy() || this.dirty() || this.labeledCount() !== d.items.length) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.service.complete(d.id).subscribe({ next: result => { this.detail.set(result); this.busy.set(false); this.page.set(0); }, error: e => this.fail(e) });
  }
  protected back(): void {
    if (this.dirty() && !window.confirm('Discard unsaved labels?')) return;
    this.detail.set(null); this.message.set(''); this.dirty.set(false); this.loadPeriod(this.periodId());
  }
  protected retry(): void {
    if (this.dirty()) this.save();
    else if (this.detail()) this.open(this.detail()!.id);
    else this.loadPeriod(this.periodId());
  }
  protected cell(human: string, ai: string): number { return this.detail()?.metrics?.confusion.find(c => c.human === human && c.ai === ai)?.count ?? 0; }
  private fail(e: HttpErrorResponse): void { this.busy.set(false); this.error.set(e.error?.detail ?? 'Could not update sentiment validation. Please try again.'); }
}
