import { DatePipe } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ClassEvaluationStatusDto,
  ClassMembershipDto,
  ClassMasterlistEntryDto,
  ClassMembershipStatus,
  ClassOfferingDto,
  MasterlistImportResultDto,
  MasterlistValidationReportDto,
} from '../../../../core/models/dean.models';
import { Subscription } from 'rxjs';
import { ProfileAvatar } from '../../../../shared/components/profile-avatar/profile-avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { DeanClassesService } from '../../services/dean-classes.service';

@Component({
  selector: 'app-dean-class-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ProfileAvatar, Icon, Modal],
  styleUrls: ['./dean-class-detail.css', './class-roster.css'],
  templateUrl: './dean-class-detail.html',
})
export class DeanClassDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly classesService = inject(DeanClassesService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly workspaceRoot = inject(AuthService).currentUser()?.roles.includes('Guidance') ? '/guidance' : '/dean';
  protected readonly rosterListPath = this.workspaceRoot === '/guidance' ? '/guidance/rosters' : '/dean/classes';

  protected readonly editor = signal<'add' | 'import' | null>(null);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  private statusRequest?: Subscription;
  protected readonly statusRows = computed(() => new Map(this.evaluationStatus()?.students.map(s => [s.studentId, s]) ?? []));
  protected readonly completion = computed(() => {
    const s = this.evaluationStatus();
    return s?.totalStudents ? Math.round(s.submittedCount / s.totalStudents * 100) : 0;
  });
  protected readonly filteredStudents = computed(() => {
    const query = this.search().toLowerCase().trim();
    return this.activeStudents().filter(s => {
      const status = this.statusRows().get(s.studentId);
      return (!query || (s.studentName + ' ' + s.studentNumber).toLowerCase().includes(query))
        && (this.statusFilter() === 'all' || !!status && (this.statusFilter() === 'submitted' ? status.submitted : !status.submitted));
    }).sort((a, b) => Number(this.statusRows().get(a.studentId)?.submitted ?? false)
      - Number(this.statusRows().get(b.studentId)?.submitted ?? false) || a.studentName.localeCompare(b.studentName));
  });

  private readonly offeringId = this.route.snapshot.paramMap.get('id')!;

  protected readonly offering = signal<ClassOfferingDto | null>(null);
  protected readonly students = signal<ClassMembershipDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly activeStudents = () => this.students().filter((s) => s.status === ClassMembershipStatus.Approved);

  // Manual add
  protected readonly addForm = this.formBuilder.nonNullable.group({
    studentNumber: ['', [Validators.required]],
  });
  protected readonly addSubmitting = signal(false);
  protected readonly addError = signal<string | null>(null);

  // Masterlist upload
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly validating = signal(false);
  protected readonly validationError = signal<string | null>(null);
  protected readonly report = signal<MasterlistValidationReportDto | null>(null);
  protected readonly importing = signal(false);
  protected readonly importResult = signal<MasterlistImportResultDto | null>(null);

  protected readonly busyStudentId = signal<string | null>(null);
  protected readonly pendingRegistrations = signal<ClassMasterlistEntryDto[]>([]);
  protected readonly masterlistError = signal<string | null>(null);
  protected readonly busyMasterlistId = signal<string | null>(null);

  // Completion records are available to Dean and Guidance, never instructors.
  protected readonly evaluationStatus = signal<ClassEvaluationStatusDto | null>(null);
  protected readonly evaluationStatusLoading = signal(true);
  protected readonly evaluationStatusMessage = signal<string | null>(null);
  protected readonly evaluationStatusError = signal<string | null>(null);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('upload') === 'true') this.editor.set('import');
    this.refreshOffering();
    this.refreshStudents();
    this.refreshEvaluationStatus();
    this.refreshMasterlist();
  }

  ngOnDestroy(): void { this.statusRequest?.unsubscribe(); }

  protected refreshMasterlist(): void {
    if (this.workspaceRoot !== '/guidance') return;
    this.masterlistError.set(null);
    this.classesService.getMasterlist(this.offeringId).subscribe({
      next: entries => this.pendingRegistrations.set(entries.filter(e => !e.isRegistered)),
      error: () => this.masterlistError.set('Could not load student numbers awaiting registration.'),
    });
  }

  protected removePendingRegistration(entry: ClassMasterlistEntryDto): void {
    if (!confirm(`Remove student number ${entry.studentNumber} from this master list?`)) return;
    this.busyMasterlistId.set(entry.id);
    this.classesService.removeMasterlistEntry(this.offeringId, entry.id).subscribe({
      next: () => { this.busyMasterlistId.set(null); this.refreshMasterlist(); },
      error: (error: HttpErrorResponse) => {
        this.busyMasterlistId.set(null);
        this.masterlistError.set(error.error?.detail ?? 'Could not remove this student number.');
      },
    });
  }

  protected refreshEvaluationStatus(): void {
    this.statusRequest?.unsubscribe();
    this.evaluationStatus.set(null);
    this.evaluationStatusLoading.set(true);
    this.evaluationStatusMessage.set(null);
    this.evaluationStatusError.set(null);

    this.statusRequest = this.classesService.getEvaluationStatus(this.offeringId).subscribe({
      next: (status) => {
        this.evaluationStatus.set(status);
        this.evaluationStatusLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.evaluationStatusLoading.set(false);
        this.statusFilter.set('all');
        if (error.status === 409) {
          this.evaluationStatusMessage.set(error.error?.detail ?? 'There is no active evaluation period right now.');
        } else {
          this.evaluationStatusError.set(error.error?.detail ?? 'Could not load evaluation status.');
        }
      },
    });
  }

  private refreshStudents(): void {
    this.loading.set(true);
    this.classesService.getStudents(this.offeringId).subscribe({
      next: (students) => {
        this.students.set(students);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the roster.');
        this.loading.set(false);
      },
    });
  }

  protected submitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.addSubmitting.set(true);
    this.addError.set(null);

    this.classesService.addStudent(this.offeringId, this.addForm.getRawValue()).subscribe({
      next: () => {
        this.addSubmitting.set(false);
        this.addForm.reset({ studentNumber: '' });
        this.editor.set(null);
        this.refreshStudents();
        this.refreshOffering();
        this.refreshEvaluationStatus();
      },
      error: (error: HttpErrorResponse) => {
        this.addSubmitting.set(false);
        this.addError.set(error.error?.detail ?? 'Could not add this student.');
      },
    });
  }

  protected removeStudent(membership: ClassMembershipDto): void {
    if (!confirm(`Remove ${membership.studentName} (${membership.studentNumber}) from this class?`)) return;

    this.busyStudentId.set(membership.studentId);
    this.errorMessage.set(null);

    this.classesService.removeStudent(this.offeringId, membership.studentId, null).subscribe({
      next: () => {
        this.busyStudentId.set(null);
        this.refreshStudents();
        this.refreshOffering();
        this.refreshEvaluationStatus();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.detail ?? 'Could not remove this student.');
        this.busyStudentId.set(null);
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.report.set(null);
    this.importResult.set(null);
    this.validationError.set(null);
    const file = this.selectedFile();
    if (file && (!file.name.toLowerCase().endsWith('.csv') || file.size === 0)) {
      this.validationError.set('Choose a non-empty CSV file.');
      this.selectedFile.set(null);
    }
  }

  protected validateFile(): void {
    const file = this.selectedFile();
    if (!file || this.validating() || this.importing()) return;

    this.validating.set(true);
    this.validationError.set(null);
    this.report.set(null);
    this.importResult.set(null);

    this.classesService.validateMasterlist(this.offeringId, file).subscribe({
      next: (report) => {
        this.report.set(report);
        this.validating.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.validationError.set(this.extractFileError(error) ?? error.error?.detail ?? 'Could not validate the file.');
        this.validating.set(false);
      },
    });
  }

  protected importValidRows(): void {
    const report = this.report();
    if (!report || report.valid.length === 0 || this.validating() || this.importing()) return;

    this.importing.set(true);
    this.validationError.set(null);

    this.classesService.importMasterlist(this.offeringId, report.valid.map((r) => r.studentNumber)).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.importing.set(false);
        this.report.set(null);
        this.selectedFile.set(null);
        this.refreshMasterlist();
        this.refreshStudents();
        this.refreshOffering();
        this.refreshEvaluationStatus();
      },
      error: (error: HttpErrorResponse) => {
        this.validationError.set(error.error?.detail ?? 'Could not import the masterlist.');
        this.importing.set(false);
      },
    });
  }

  private refreshOffering(): void {
    this.classesService.getById(this.offeringId).subscribe({
      next: offering => this.offering.set(offering),
      error: () => this.errorMessage.set('Could not load the class details.'),
    });
  }

  private extractFileError(error: HttpErrorResponse): string | null {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : null;
  }
}
