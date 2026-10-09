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

@Component({
  selector: 'app-admin-instructors',
  imports: [Icon, ReactiveFormsModule, Modal],
  templateUrl: './admin-instructors.html',
})
export class AdminInstructors implements OnInit {
  private readonly instructorsService = inject(AdminInstructorsService);
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly usersService = inject(AdminUsersService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly instructors = signal<InstructorDto[]>([]);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Users with the Instructor role who don't already have a profile - the realistic picker list for "New instructor". */
  protected readonly availableUsers = computed(() => {
    const linkedUserIds = new Set(this.instructors().map((i) => i.userId));
    return this.users().filter((u) => u.roles.includes(AppRoles.Instructor) && !linkedUserIds.has(u.id));
  });

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingInstructor = signal<InstructorDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    userId: ['', [Validators.required]],
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
    this.usersService.list().subscribe({ next: (users) => this.users.set(users) });
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
    this.createForm.reset({ userId: '', employeeNumber: '', firstName: '', lastName: '', departmentId: '' });
    this.createError.set(null);
    this.showCreateModal.set(true);
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
      next: () => {
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
        this.refresh();
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
