import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '../../../shared/components/icon/icon';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { EvaluationPeriodDto } from '../../../core/models/evaluation.models';
import { AdminEvaluationPeriodsService } from '../../admin/services/admin-evaluation-periods.service';
import { StudentMasterlistEntry, StudentMasterlistImportResult, StudentMasterlistService, StudentMasterlistValidation } from './student-masterlist.service';

@Component({
  selector: 'app-student-masterlist', imports: [Icon, PageHeader, Modal, ReactiveFormsModule],
  templateUrl: './student-masterlist.html', styleUrl: './student-masterlist.css',
})
export class StudentMasterlist implements OnInit {
  private readonly service = inject(StudentMasterlistService);
  private readonly periodService = inject(AdminEvaluationPeriodsService);
  protected readonly periods = signal<EvaluationPeriodDto[]>([]);
  protected readonly periodId = signal('');
  protected readonly editable = computed(() => !!this.periodId() && this.periods().find(p => p.id === this.periodId())?.status !== 'Closed');
  protected readonly entries = signal<StudentMasterlistEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly report = signal<StudentMasterlistValidation | null>(null);
  protected readonly result = signal<StudentMasterlistImportResult | null>(null);
  protected readonly removingId = signal<string | null>(null);
  protected readonly editing = signal<StudentMasterlistEntry | null>(null);
  protected readonly modal = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    studentNumber: ['', [Validators.required, Validators.maxLength(30)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    middleName: ['', Validators.maxLength(100)], lastName: ['', [Validators.required, Validators.maxLength(100)]],
  });
  protected readonly visibleEntries = computed(() => this.entries().filter(e =>
    [e.studentNumber, e.firstName, e.middleName, e.lastName].join(' ').toLowerCase().includes(this.search().trim().toLowerCase())
    && (!this.status() || e.isActive === (this.status() === 'active')),
  ));

  ngOnInit(): void {
    this.periodService.list().subscribe({
      next: periods => { this.periods.set(periods); this.periodId.set((periods.find(p => p.status === 'Active') ?? periods[0])?.id ?? ''); this.refresh(); },
      error: e => { this.loadError.set(this.errorText(e, 'Could not load evaluation periods.')); this.loading.set(false); },
    });
  }
  protected selectPeriod(id: string): void {
    this.periodId.set(id); this.report.set(null); this.result.set(null); this.selectedFile.set(null);
    this.uploadError.set(null); this.modal.set(false); this.refresh();
  }
  protected refresh(): void {
    if (!this.periodId()) { this.entries.set([]); this.loading.set(false); return; }
    this.loading.set(true); this.loadError.set(null);
    const selected = this.periodId();
    this.service.list(selected).subscribe({
      next: entries => { if (this.periodId() === selected) { this.entries.set(entries); this.loading.set(false); } },
      error: e => { if (this.periodId() === selected) { this.loadError.set(this.errorText(e, 'Could not load the master list.')); this.loading.set(false); } },
    });
  }
  protected open(entry: StudentMasterlistEntry | null = null): void {
    this.editing.set(entry);
    this.form.reset(entry ? { studentNumber: entry.studentNumber, firstName: entry.firstName, middleName: entry.middleName ?? '', lastName: entry.lastName }
      : { studentNumber: '', firstName: '', middleName: '', lastName: '' });
    this.saveError.set(''); this.modal.set(true);
  }
  protected save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.saveError.set('');
    const student = this.form.getRawValue();
    this.service.save(this.editing()?.id ?? null, this.periodId(), { ...student, middleName: student.middleName || null }).subscribe({
      next: () => { this.saving.set(false); this.modal.set(false); this.refresh(); },
      error: e => { this.saving.set(false); this.saveError.set(this.errorText(e, 'Could not save student.')); },
    });
  }
  protected chooseFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile.set(null); this.report.set(null); this.result.set(null); this.uploadError.set(null);
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) {
      this.uploadError.set('Choose a non-empty CSV or XLSX file, at most 10 MB.'); return;
    }
    this.selectedFile.set(file);
  }
  protected validate(): void {
    const file = this.selectedFile();
    if (!file || this.busy() || !this.editable()) return;
    this.busy.set(true); this.report.set(null); this.result.set(null); this.uploadError.set(null);
    this.service.validate(file, this.periodId()).subscribe({
      next: r => { this.report.set(r); this.busy.set(false); },
      error: e => { this.uploadError.set(this.errorText(e, 'Could not validate this file.')); this.busy.set(false); },
    });
  }
  protected importValid(): void {
    const students = this.report()?.valid;
    if (!students?.length || this.busy() || !this.editable()) return;
    this.busy.set(true); this.uploadError.set(null);
    this.service.import(students, this.periodId()).subscribe({
      next: r => { this.result.set(r); this.report.set(null); this.busy.set(false); this.refresh(); },
      error: e => { this.uploadError.set(this.errorText(e, 'Could not import these students.')); this.busy.set(false); },
    });
  }
  protected remove(entry: StudentMasterlistEntry): void {
    if (this.removingId() || !confirm(`Deactivate ${entry.studentNumber} for this period? Historical submissions will be retained.`)) return;
    this.removingId.set(entry.id);
    this.service.remove(entry.id).subscribe({
      next: () => { this.removingId.set(null); this.refresh(); },
      error: e => { this.loadError.set(this.errorText(e, 'Could not deactivate student.')); this.removingId.set(null); },
    });
  }
  protected downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob(['StudentNumber,FirstName,MiddleName,LastName\r\n'], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'student-masterlist-template.csv'; link.click(); URL.revokeObjectURL(url);
  }
  private errorText(e: HttpErrorResponse, fallback: string): string {
    const errors = e.error?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : e.error?.detail ?? fallback;
  }
}
