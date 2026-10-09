import { AuthService } from '../../../core/auth/auth.service';
import { AdminInstructorsService } from '../../admin/services/admin-instructors.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstructorDto, SectionDto, SubjectDto } from '../../../core/models/admin.models';
import { ClassRequestDto, ClassRequestStatus, MasterlistValidationReportDto } from '../../../core/models/dean.models';
import { AdminSectionsService } from '../../admin/services/admin-sections.service';
import { AdminSubjectsService } from '../../admin/services/admin-subjects.service';
import { InstructorClassRequestsService } from '../services/instructor-class-requests.service';

@Component({
  selector: 'app-instructor-class-requests',
  imports: [ReactiveFormsModule],
  templateUrl: './instructor-class-requests.html',
})
export class InstructorClassRequests implements OnInit {
  private readonly requestsService = inject(InstructorClassRequestsService);
  private readonly subjectsService = inject(AdminSubjectsService);
  private readonly sectionsService = inject(AdminSectionsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Status = ClassRequestStatus;
  protected readonly isGuidance = inject(AuthService).currentUser()?.roles.includes('Guidance') ?? false;
  private readonly instructorsService = inject(AdminInstructorsService);
  protected readonly instructors = signal<InstructorDto[]>([]);
  protected readonly selectedInstructor = signal('');
  protected readonly availableSections = computed(() => {
    const instructor = this.instructors().find(i => i.id === this.selectedInstructor());
    return this.sections().filter(s => s.isActive && (!this.isGuidance || s.departmentId === instructor?.departmentId));
  });

  protected readonly myRequests = signal<ClassRequestDto[]>([]);
  protected readonly subjects = signal<SubjectDto[]>([]);
  protected readonly sections = signal<SectionDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly skippedNumbers = signal<string[]>([]);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    instructorId: [''],
    subjectId: ['', [Validators.required]],
    sectionId: ['', [Validators.required]],
    term: ['', [Validators.required, Validators.maxLength(100)]],
    proposedStudentNumbersRaw: [''],
  });

  // CSV masterlist upload - merged into proposedStudentNumbers on submit.
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly parsing = signal(false);
  protected readonly parseError = signal<string | null>(null);
  protected readonly parseReport = signal<MasterlistValidationReportDto | null>(null);
  protected readonly csvStudentNumbers = signal<string[]>([]);

  ngOnInit(): void {
    if (this.isGuidance) {
      this.form.controls.instructorId.addValidators(Validators.required);
      this.form.controls.instructorId.updateValueAndValidity();
      this.instructorsService.list().subscribe({ next: rows => this.instructors.set(rows.filter(i => i.isActive)) });
      this.form.controls.instructorId.valueChanges.subscribe(id => {
        this.selectedInstructor.set(id);
        this.form.controls.sectionId.setValue('');
      });
    }
    this.refresh();
    this.subjectsService.list().subscribe({ next: (subjects) => this.subjects.set(subjects.filter(s => s.isActive)) });
    this.sectionsService.list().subscribe({ next: (sections) => this.sections.set(sections) });
  }

  private refresh(): void {
    this.loading.set(true);
    this.requestsService.getMine().subscribe({
      next: (requests) => {
        this.myRequests.set(requests);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your class requests.');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.successMessage.set(null);
    this.skippedNumbers.set([]);

    const raw = this.form.getRawValue();
    const typedNumbers = raw.proposedStudentNumbersRaw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const merged = new Set([...typedNumbers, ...this.csvStudentNumbers()]);
    const proposedStudentNumbers = Array.from(merged);

    this.requestsService
      .create({ subjectId: raw.subjectId, sectionId: raw.sectionId, term: raw.term, proposedStudentNumbers, ...(this.isGuidance ? { instructorId: raw.instructorId } : {}) })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.successMessage.set('Class request submitted for review.');
          this.skippedNumbers.set(result.skippedStudentNumbers);
          this.myRequests.update((requests) => [result.request, ...requests]);
          this.form.reset({ subjectId: '', sectionId: '', term: '', proposedStudentNumbersRaw: '' });
          this.clearMasterlist();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.submitError.set(error.error?.detail ?? 'Could not submit this request.');
        },
      });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.parseReport.set(null);
    this.parseError.set(null);
  }

  protected parseFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.parsing.set(true);
    this.parseError.set(null);
    this.parseReport.set(null);

    this.requestsService.parseMasterlist(file).subscribe({
      next: (report) => {
        this.parseReport.set(report);
        this.csvStudentNumbers.update((existing) => {
          const merged = new Set([...existing, ...report.valid.map((r) => r.studentNumber)]);
          return Array.from(merged);
        });
        this.parsing.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.parseError.set(error.error?.detail ?? this.extractFileError(error) ?? 'Could not read this file.');
        this.parsing.set(false);
      },
    });
  }

  protected removeCsvNumber(studentNumber: string): void {
    this.csvStudentNumbers.update((numbers) => numbers.filter((n) => n !== studentNumber));
  }

  private clearMasterlist(): void {
    this.selectedFile.set(null);
    this.parseReport.set(null);
    this.parseError.set(null);
    this.csvStudentNumbers.set([]);
  }

  private extractFileError(error: HttpErrorResponse): string | null {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : null;
  }
}
