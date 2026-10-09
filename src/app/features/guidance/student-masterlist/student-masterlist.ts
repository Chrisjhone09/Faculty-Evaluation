import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StudentMasterlistEntry, StudentMasterlistImportResult, StudentMasterlistService, StudentMasterlistValidation } from './student-masterlist.service';

@Component({
  selector: 'app-student-masterlist',
  imports: [Icon, PageHeader],
  templateUrl: './student-masterlist.html',
  styleUrl: './student-masterlist.css',
})
export class StudentMasterlist implements OnInit {
  private readonly service = inject(StudentMasterlistService);
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
  protected readonly visibleEntries = computed(() => this.entries().filter(e =>
    e.studentNumber.toLowerCase().includes(this.search().trim().toLowerCase())
    && (!this.status() || e.isRegistered === (this.status() === 'registered')),
  ));

  ngOnInit(): void { this.refresh(); }

  protected refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.list().subscribe({
      next: entries => { this.entries.set(entries); this.loading.set(false); },
      error: error => { this.loadError.set(this.errorText(error, 'Could not load the student master list.')); this.loading.set(false); },
    });
  }

  protected chooseFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile.set(null);
    this.report.set(null);
    this.result.set(null);
    this.uploadError.set(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') || !file.size) {
      this.uploadError.set('Choose a non-empty CSV file.');
      return;
    }
    this.selectedFile.set(file);
  }

  protected validate(): void {
    const file = this.selectedFile();
    if (!file || this.busy()) return;
    this.busy.set(true);
    this.report.set(null);
    this.result.set(null);
    this.uploadError.set(null);
    this.service.validate(file).subscribe({
      next: report => { this.report.set(report); this.busy.set(false); },
      error: error => { this.uploadError.set(this.errorText(error, 'Could not validate this CSV.')); this.busy.set(false); },
    });
  }

  protected importValid(): void {
    const numbers = this.report()?.valid.map(r => r.studentNumber);
    if (!numbers?.length || this.busy()) return;
    this.busy.set(true);
    this.uploadError.set(null);
    this.service.import(numbers).subscribe({
      next: result => { this.result.set(result); this.report.set(null); this.busy.set(false); this.refresh(); },
      error: error => { this.uploadError.set(this.errorText(error, 'Could not import these student numbers.')); this.busy.set(false); },
    });
  }

  protected remove(entry: StudentMasterlistEntry): void {
    if (this.removingId() || !confirm(`Remove ${entry.studentNumber} from the school-wide master list? Existing accounts and class enrollments will not change.`)) return;
    this.removingId.set(entry.id);
    this.loadError.set(null);
    this.service.remove(entry.id).subscribe({
      next: () => { this.entries.update(entries => entries.filter(e => e.id !== entry.id)); this.removingId.set(null); },
      error: error => { this.loadError.set(this.errorText(error, 'Could not remove this student number.')); this.removingId.set(null); },
    });
  }

  protected downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob(['StudentNumber\r\n'], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-masterlist-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : error.error?.detail ?? fallback;
  }
}
