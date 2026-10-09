import { Icon } from '../../../shared/components/icon/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentDto, SectionDto } from '../../../core/models/admin.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminSectionsService } from '../services/admin-sections.service';

@Component({
  selector: 'app-admin-sections',
  imports: [Icon, ReactiveFormsModule, Modal],
  templateUrl: './admin-sections.html',
})
export class AdminSections implements OnInit {
  private readonly sectionsService = inject(AdminSectionsService);
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly sections = signal<SectionDto[]>([]);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingSection = signal<SectionDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    departmentId: ['', [Validators.required]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    departmentId: ['', [Validators.required]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.sectionsService.list().subscribe({
      next: (sections) => {
        this.sections.set(sections);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load sections.');
        this.loading.set(false);
      },
    });

    this.departmentsService.list().subscribe({ next: (departments) => this.departments.set(departments) });
  }

  protected openCreateModal(): void {
    this.createForm.reset({ code: '', departmentId: '' });
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

    this.sectionsService.create(this.createForm.getRawValue()).subscribe({
      next: (section) => {
        this.sections.update((sections) => [...sections, section]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create section.');
      },
    });
  }

  protected openEditModal(section: SectionDto): void {
    this.editForm.setValue({ code: section.code, departmentId: section.departmentId, isActive: section.isActive });
    this.editingSection.set(section);
    this.editError.set(null);
  }

  protected submitEdit(): void {
    const section = this.editingSection();
    if (!section || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);

    this.sectionsService.update(section.id, this.editForm.getRawValue()).subscribe({
      next: (updated) => {
        this.sections.update((sections) => sections.map((s) => (s.id === updated.id ? updated : s)));
        this.editSubmitting.set(false);
        this.editingSection.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(error.error?.detail ?? 'Could not save changes.');
      },
    });
  }
}
