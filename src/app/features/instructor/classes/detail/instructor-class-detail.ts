import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ClassMembershipDto,
  ClassMembershipStatus,
  ClassOfferingDto,
  MasterlistImportResultDto,
  MasterlistValidationReportDto,
} from '../../../../core/models/dean.models';
import { InstructorClassesService } from '../../services/instructor-classes.service';

/**
 * Mirrors DeanClassDetail, minus the Remove-student action (RemoveStudent
 * stays Dean-only - not part of the "instructor can manage their own roster"
 * extension the user asked for).
 */
@Component({
  selector: 'app-instructor-class-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './instructor-class-detail.html',
})
export class InstructorClassDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly classesService = inject(InstructorClassesService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly MembershipStatus = ClassMembershipStatus;

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

  ngOnInit(): void {
    this.classesService.getById(this.offeringId).subscribe({ next: (offering) => this.offering.set(offering) });
    this.refreshStudents();
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
        this.refreshStudents();
        this.refreshOffering();
      },
      error: (error: HttpErrorResponse) => {
        this.addSubmitting.set(false);
        this.addError.set(error.error?.detail ?? 'Could not add this student.');
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.report.set(null);
    this.importResult.set(null);
    this.validationError.set(null);
  }

  protected validateFile(): void {
    const file = this.selectedFile();
    if (!file) return;

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
        this.validationError.set(error.error?.detail ?? this.extractFileError(error) ?? 'Could not validate the file.');
        this.validating.set(false);
      },
    });
  }

  protected importValidRows(): void {
    const report = this.report();
    if (!report || report.valid.length === 0) return;

    this.importing.set(true);
    this.validationError.set(null);

    this.classesService.importMasterlist(this.offeringId, report.valid.map((r) => r.studentNumber)).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.importing.set(false);
        this.report.set(null);
        this.selectedFile.set(null);
        this.refreshStudents();
        this.refreshOffering();
      },
      error: (error: HttpErrorResponse) => {
        this.validationError.set(error.error?.detail ?? 'Could not import the masterlist.');
        this.importing.set(false);
      },
    });
  }

  private refreshOffering(): void {
    this.classesService.getById(this.offeringId).subscribe({ next: (offering) => this.offering.set(offering) });
  }

  private extractFileError(error: HttpErrorResponse): string | null {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : null;
  }
}
