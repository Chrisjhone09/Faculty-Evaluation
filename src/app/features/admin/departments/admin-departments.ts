import { Icon } from '../../../shared/components/icon/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentDto, UserDto } from '../../../core/models/admin.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-admin-departments',
  imports: [Icon, ReactiveFormsModule, Modal],
  templateUrl: './admin-departments.html',
})
export class AdminDepartments implements OnInit {
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly usersService = inject(AdminUsersService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingDepartment = signal<DepartmentDto | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly assigningDeanFor = signal<DepartmentDto | null>(null);
  protected readonly selectedDeanUserId = signal<string>('');
  protected readonly assignSubmitting = signal(false);
  protected readonly assignError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.departmentsService.list().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load departments.');
        this.loading.set(false);
      },
    });

    // Loaded up front so the "Assign Dean" picker doesn't need a network
    // round trip every time it opens.
    this.usersService.list().subscribe({ next: (users) => this.users.set(users) });
  }

  protected deanLabel(department: DepartmentDto): string {
    if (!department.deanUserId) return 'Unassigned';
    const user = this.users().find((u) => u.id === department.deanUserId);
    return user ? `${user.fullName} (${user.email})` : department.deanUserId;
  }

  protected openCreateModal(): void {
    this.createForm.reset();
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

    this.departmentsService.create(this.createForm.getRawValue()).subscribe({
      next: (department) => {
        this.departments.update((departments) => [...departments, department]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create department.');
      },
    });
  }

  protected openEditModal(department: DepartmentDto): void {
    this.editingDepartment.set(department);
    this.editForm.setValue({ code: department.code, name: department.name, isActive: department.isActive });
    this.editError.set(null);
  }

  protected submitEdit(): void {
    const department = this.editingDepartment();
    if (!department || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);

    this.departmentsService.update(department.id, this.editForm.getRawValue()).subscribe({
      next: (updated) => {
        this.departments.update((departments) => departments.map((d) => (d.id === updated.id ? updated : d)));
        this.editSubmitting.set(false);
        this.editingDepartment.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(error.error?.detail ?? 'Could not update department.');
      },
    });
  }

  protected openAssignDean(department: DepartmentDto): void {
    this.assigningDeanFor.set(department);
    this.selectedDeanUserId.set(department.deanUserId ?? '');
    this.assignError.set(null);
  }

  protected submitAssignDean(): void {
    const department = this.assigningDeanFor();
    if (!department || !this.selectedDeanUserId()) {
      this.assignError.set('Select a user first.');
      return;
    }

    this.assignSubmitting.set(true);
    this.assignError.set(null);

    this.departmentsService.assignDean(department.id, { userId: this.selectedDeanUserId() }).subscribe({
      next: (updated) => {
        this.departments.update((departments) => departments.map((d) => (d.id === updated.id ? updated : d)));
        this.assignSubmitting.set(false);
        this.assigningDeanFor.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.assignSubmitting.set(false);
        this.assignError.set(error.error?.detail ?? 'Could not assign dean.');
      },
    });
  }
}
