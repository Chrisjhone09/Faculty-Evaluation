import { Icon } from '../../../shared/components/icon/icon';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluationFormDto } from '../../../core/models/evaluation.models';
import { EvaluationPeriodDto, EvaluationPeriodStatus } from '../../../core/models/evaluation.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminEvaluationFormsService } from '../services/admin-evaluation-forms.service';
import { AdminEvaluationPeriodsService } from '../services/admin-evaluation-periods.service';

@Component({
  selector: 'app-admin-evaluation-periods',
  imports: [Icon, ReactiveFormsModule, Modal, DatePipe],
  templateUrl: './admin-evaluation-periods.html',
})
export class AdminEvaluationPeriods implements OnInit {
  private readonly periodsService = inject(AdminEvaluationPeriodsService);
  private readonly formsService = inject(AdminEvaluationFormsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Status = EvaluationPeriodStatus;

  protected readonly periods = signal<EvaluationPeriodDto[]>([]);
  protected readonly forms = signal<EvaluationFormDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly busyId = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingPeriod = signal<EvaluationPeriodDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    evaluationFormId: ['', [Validators.required]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    evaluationFormId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.refresh();
    this.formsService.list().subscribe({ next: (forms) => this.forms.set(forms) });
  }

  private refresh(): void {
    this.loading.set(true);
    this.periodsService.list().subscribe({
      next: (periods) => {
        this.periods.set(periods);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load evaluation periods.');
        this.loading.set(false);
      },
    });
  }

  /**
   * <input type="datetime-local"> only knows local wall-clock time (no
   * timezone info at all) - it neither sends nor accepts a "Z"/offset. The
   * API's StartDate/EndDate are true UTC instants (compared against
   * DateTime.UtcNow server-side to decide whether a period is open right
   * now), so this pair of helpers is the ONLY place that conversion happens.
   * Getting this wrong is exactly what used to make an evaluation period
   * that looked "open" in the UI reject every student submission: the raw
   * local time was sent with no conversion, so e.g. a period picked as
   * "starts now" in UTC+8 was stored 8 hours in the future relative to the
   * server's real UTC clock.
   */
  private toUtcIso(localValue: string): string {
    return new Date(localValue).toISOString();
  }

  /** Inverse of toUtcIso - converts a UTC ISO string (with "Z"/offset) from the API into the local "YYYY-MM-DDTHH:mm" the picker input expects. */
  private toLocalInputValue(isoUtc: string): string {
    const d = new Date(isoUtc);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  protected openCreateModal(): void {
    const activeForm = this.forms().find((f) => f.isActive);
    this.createForm.reset({ name: '', startDate: '', endDate: '', evaluationFormId: activeForm?.id ?? '' });
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.createSubmitting.set(true);
    this.createError.set(null);

    const raw = this.createForm.getRawValue();
    const request = { ...raw, startDate: this.toUtcIso(raw.startDate), endDate: this.toUtcIso(raw.endDate) };

    this.periodsService.create(request).subscribe({
      next: (period) => {
        this.periods.update((periods) => [period, ...periods]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(this.extractErrorMessage(error, 'Could not create evaluation period.'));
      },
    });
  }

  protected openEditModal(period: EvaluationPeriodDto): void {
    this.editForm.setValue({
      name: period.name,
      startDate: this.toLocalInputValue(period.startDate),
      endDate: this.toLocalInputValue(period.endDate),
      evaluationFormId: period.evaluationFormId,
    });
    this.editingPeriod.set(period);
    this.editError.set(null);
  }

  protected submitEdit(): void {
    const period = this.editingPeriod();
    if (!period || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);

    const raw = this.editForm.getRawValue();
    const request = { ...raw, startDate: this.toUtcIso(raw.startDate), endDate: this.toUtcIso(raw.endDate) };

    this.periodsService.update(period.id, request).subscribe({
      next: (updated) => {
        this.periods.update((periods) => periods.map((p) => (p.id === updated.id ? updated : p)));
        this.editSubmitting.set(false);
        this.editingPeriod.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(this.extractErrorMessage(error, 'Could not save changes.'));
      },
    });
  }

  protected activate(period: EvaluationPeriodDto): void {
    this.busyId.set(period.id);
    this.errorMessage.set(null);

    this.periodsService.activate(period.id).subscribe({
      next: (updated) => {
        this.periods.update((periods) => periods.map((p) => (p.id === updated.id ? updated : p)));
        this.busyId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.extractErrorMessage(error, `Could not activate "${period.name}".`));
        this.busyId.set(null);
      },
    });
  }

  protected close(period: EvaluationPeriodDto): void {
    if (!confirm(`Close "${period.name}"? Students won't be able to submit evaluations for it anymore.`)) return;

    this.busyId.set(period.id);
    this.errorMessage.set(null);

    this.periodsService.close(period.id).subscribe({
      next: (updated) => {
        this.periods.update((periods) => periods.map((p) => (p.id === updated.id ? updated : p)));
        this.busyId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.extractErrorMessage(error, `Could not close "${period.name}".`));
        this.busyId.set(null);
      },
    });
  }

  protected deletePeriod(period: EvaluationPeriodDto): void {
    if (!confirm(`Delete "${period.name}"? This can't be undone.`)) return;

    this.busyId.set(period.id);
    this.errorMessage.set(null);

    this.periodsService.delete(period.id).subscribe({
      next: () => {
        this.periods.update((periods) => periods.filter((p) => p.id !== period.id));
        this.busyId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.extractErrorMessage(error, `Could not delete "${period.name}".`));
        this.busyId.set(null);
      },
    });
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    if (errors) {
      return Object.values(errors).flat().join(' ');
    }
    return error.error?.detail ?? fallback;
  }
}
