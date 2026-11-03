import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { EvaluationPeriodDto } from '../../../core/models/evaluation.models';
import { AdminEvaluationPeriodsService } from '../../admin/services/admin-evaluation-periods.service';

@Component({
  selector: 'app-report-period',
  template: `<div class="form-field"><label for="report-period">Evaluation period</label>
    <select id="report-period" [value]="value || ''" [disabled]="disabled" (change)="choose($any($event.target).value)">
      @for (p of periods(); track p.id) { <option [value]="p.id">{{ p.name }} ({{ p.status }})</option> }
      @if (!periods().length) { <option value="">No evaluation periods</option> }
    </select></div>@if (error()) { <p class="field-error">{{ error() }}</p> }`,
  styles: [':host { display: block; max-width: 420px; margin-bottom: 20px; } .form-field { margin: 0; }'],
})
export class ReportPeriod implements OnInit {
  @Input() value: string | undefined;
  @Input() disabled = false;
  @Output() selected = new EventEmitter<string | undefined>();
  protected readonly periods = signal<EvaluationPeriodDto[]>([]);
  protected readonly error = signal('');
  private readonly service = inject(AdminEvaluationPeriodsService);
  ngOnInit(): void { this.service.list().subscribe({
    next: rows => { this.periods.set(rows); this.choose(this.value || (rows.find(p => p.status === 'Active') ?? rows[0])?.id || ''); },
    error: () => { this.error.set('Could not load period choices.'); this.selected.emit(this.value); },
  }); }
  protected choose(value: string): void { this.value = value || undefined; this.selected.emit(this.value); }
}
