import { Icon } from '../../../shared/components/icon/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppRoles } from '../../../core/models/auth.models';
import { DepartmentDto, InstructorDto, UserDto } from '../../../core/models/admin.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminInstructorsService } from '../services/admin-instructors.service';
import { AdminUsersService } from '../services/admin-users.service';
import { Pagination } from '../../../shared/tables/table-parts';
import { createTableState } from '../../../shared/tables/table-state';
import { ProfileAvatar } from '../../../shared/components/profile-avatar/profile-avatar';

@Component({
  selector: 'app-admin-instructors',
  imports: [Icon, ReactiveFormsModule, Modal, Pagination, ProfileAvatar],
  templateUrl: './admin-instructors.html',
  styles: [`.instructor-name-cell { display: inline-flex; align-items: center; gap: var(--space-3); } .photo-preview { width: 72px; height: 72px; display: block; margin-top: var(--space-2); object-fit: cover; border-radius: 50%; } .edit-photo { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }`],
})
export class AdminInstructors implements OnInit {
  private readonly instructorsService = inject(AdminInstructorsService);
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly usersService = inject(AdminUsersService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly instructors = signal<InstructorDto[]>([]);
  protected readonly table = createTableState(this.instructors, { searchFields: i => [i.firstName, i.lastName, i.employeeNumber, i.departmentName], initialSort: { key: 'lastName', direction: 'asc' }, pageSize: 50 });
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deleting = signal<InstructorDto | null>(null);
  protected readonly deleteSubmitting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected openDelete(item: InstructorDto): void {
    this.deleting.set(item);
    this.deleteError.set(null);
  }

  protected closeDelete(): void {
    if (!this.deleteSubmitting()) this.deleting.set(null);
  }

  protected confirmDelete(): void {
    const item = this.deleting();
    if (!item || this.deleteSubmitting()) return;
    this.deleteSubmitting.set(true);
    this.deleteError.set(null);
    this.instructorsService.delete(item.id).subscribe({
      next: () => {
        this.instructors.update(items => items.filter(value => value.id !== item.id));
        this.deleteSubmitting.set(false);
        this.deleting.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.deleteSubmitting.set(false);
        this.deleteError.set(error.error?.detail ?? 'Could not delete this instructor. Please try again.');
      },
    });
  }

  /** Users with the Instructor role who don't already have a profile - the realistic picker list for "New instructor". */
  protected readonly availableUsers = computed(() => {
    const linkedUserIds = new Set(this.instructors().map((i) => i.userId));
    return this.users().filter((u) => u.roles.includes(AppRoles.Instructor) && !linkedUserIds.has(u.id));
  });

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createPhotoFile = signal<File | null>(null);
  protected readonly createPhotoPreview = signal<string | null>(null);
  protected readonly createPhotoError = signal('');
  protected readonly photoUploading = signal(false);

  protected readonly editingInstructor = signal<InstructorDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    userId: ['00000000-0000-0000-0000-000000000000'],
    employeeNumber: ['', [Validators.required, Validators.maxLength(30)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    departmentId: ['', [Validators.required]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    employeeNumber: ['', [Validators.required, Validators.maxLength(30)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    departmentId: ['', [Validators.required]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.refresh();
    this.departmentsService.list().subscribe({ next: (departments) => this.departments.set(departments) });

  }

  private refresh(): void {
    this.loading.set(true);
    this.instructorsService.list().subscribe({
      next: (instructors) => {
        this.instructors.set(instructors);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load instructors.');
        this.loading.set(false);
      },
    });
  }

  protected openCreateModal(): void {
    this.createForm.reset({ userId: '00000000-0000-0000-0000-000000000000', employeeNumber: '', firstName: '', lastName: '', departmentId: '' });
    this.createError.set(null);
    this.clearCreatePhoto();
    this.showCreateModal.set(true);
  }

  protected chooseCreatePhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.createPhotoError.set('');
    this.clearCreatePhoto();
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.createPhotoError.set('Choose a JPEG or PNG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.createPhotoError.set('Photo must be 5 MB or smaller.');
      return;
    }
    this.createPhotoFile.set(file);
    this.createPhotoPreview.set(URL.createObjectURL(file));
  }

  protected clearCreatePhoto(): void {
    const preview = this.createPhotoPreview();
    if (preview) URL.revokeObjectURL(preview);
    this.createPhotoFile.set(null);
    this.createPhotoPreview.set(null);
  }

  private finishCreate(): void {
    this.photoUploading.set(false);
    this.createSubmitting.set(false);
    this.showCreateModal.set(false);
    this.clearCreatePhoto();
    this.refresh();
  }

  protected onUserSelected(userId: string): void {
    const user = this.users().find((u) => u.id === userId);
    if (!user) return;

    const [firstName, ...rest] = user.fullName.split(' ');
    this.createForm.patchValue({ firstName, lastName: rest.join(' ') });
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.createSubmitting.set(true);
    this.createError.set(null);

    this.instructorsService.create(this.createForm.getRawValue()).subscribe({
      next: (created) => {
        const photo = this.createPhotoFile();
        if (!photo) {
          this.finishCreate();
          return;
        }
        this.photoUploading.set(true);
        this.instructorsService.uploadPhoto(created.id, photo).subscribe({
          next: () => this.finishCreate(),
          error: (error: HttpErrorResponse) => {
            this.photoUploading.set(false);
            this.createSubmitting.set(false);
            this.createError.set(error.error?.detail ?? 'Instructor created, but the photo could not be uploaded. You can upload it from the instructor list.');
            this.showCreateModal.set(false);
            this.clearCreatePhoto();
            this.refresh();
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create instructor.');
      },
    });
  }

  protected openEditModal(instructor: InstructorDto): void {
    this.editForm.setValue({
      employeeNumber: instructor.employeeNumber,
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      departmentId: instructor.departmentId,
      isActive: instructor.isActive,
    });
    this.editingInstructor.set(instructor);
    this.editError.set(null);
  }

  protected submitEdit(): void {
    const instructor = this.editingInstructor();
    if (!instructor || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);

    this.instructorsService.update(instructor.id, this.editForm.getRawValue()).subscribe({
      next: (updated) => {
        this.instructors.update((instructors) => instructors.map((i) => (i.id === updated.id ? updated : i)));
        this.editSubmitting.set(false);
        this.editingInstructor.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(error.error?.detail ?? 'Could not save changes.');
      },
    });
  }
}
