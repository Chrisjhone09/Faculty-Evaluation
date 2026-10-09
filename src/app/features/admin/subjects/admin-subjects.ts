import { Icon } from '../../../shared/components/icon/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentDto, SubjectDto } from '../../../core/models/admin.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminSubjectsService } from '../services/admin-subjects.service';

@Component({
  selector: 'app-admin-subjects',
  imports: [Icon, ReactiveFormsModule, Modal],
  templateUrl: './admin-subjects.html',
})
export class AdminSubjects implements OnInit {
  private readonly subjectsService = inject(AdminSubjectsService);
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly subjects = signal<SubjectDto[]>([]);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingSubject = signal<SubjectDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    units: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    departmentId: [''],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    units: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    departmentId: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.subjectsService.list().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load subjects.');
        this.loading.set(false);
      },
    });

    this.departmentsService.list().subscribe({ next: (departments) => this.departments.set(departments) });
  }

  protected openCreateModal(): void {
    this.createForm.reset({ code: '', title: '', units: 3, departmentId: '' });
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

    this.subjectsService.create({ ...raw, departmentId: raw.departmentId || null }).subscribe({
      next: (subject) => {
        this.subjects.update((subjects) => [...subjects, subject]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create subject.');
      },
    });
  }

  protected openEditModal(subject: SubjectDto): void {
    this.editForm.setValue({
      code: subject.code,
      title: subject.title,
      units: subject.units,
      departmentId: subject.departmentId ?? '',
      isActive: subject.isActive,
    });
    this.editingSubject.set(subject);
    this.editError.set(null);
  }

  protected submitEdit(): void {
    const subject = this.editingSubject();
    if (!subject || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);
    const raw = this.editForm.getRawValue();

    this.subjectsService.update(subject.id, { ...raw, departmentId: raw.departmentId || null }).subscribe({
      next: (updated) => {
        this.subjects.update((subjects) => subjects.map((s) => (s.id === updated.id ? updated : s)));
        this.editSubmitting.set(false);
        this.editingSubject.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(error.error?.detail ?? 'Could not save changes.');
      },
    });
  }
}
