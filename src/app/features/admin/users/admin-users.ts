import { Icon } from '../../../shared/components/icon/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppRoles } from '../../../core/models/auth.models';
import { Modal } from '../../../shared/components/modal/modal';
import { DepartmentDto, UserDto } from '../../../core/models/admin.models';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminDepartmentsService } from '../services/admin-departments.service';

@Component({
  selector: 'app-admin-users',
  imports: [Icon, ReactiveFormsModule, Modal],
  templateUrl: './admin-users.html',
})
export class AdminUsers implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly departmentsService = inject(AdminDepartmentsService);

  protected readonly allRoles = Object.values(AppRoles);

  protected readonly users = signal<UserDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Self-registered students awaiting Admin approval - inactive + Student role. */
  protected readonly pendingStudents = computed(() =>
    this.users().filter((u) => !u.isActive && u.roles.includes(AppRoles.Student)),
  );

  protected readonly approvingId = signal<string | null>(null);
  protected readonly rejectingUser = signal<UserDto | null>(null);
  protected readonly rejectSubmitting = signal(false);
  protected readonly rejectError = signal<string | null>(null);

  // --- Pending-approval ID photo viewer ---
  protected readonly photoLoadingId = signal<string | null>(null);
  protected readonly photoModalUser = signal<UserDto | null>(null);
  protected readonly photoModalUrl = signal<string | null>(null);
  protected readonly photoModalError = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createRoles = signal<string[]>([]);
  protected readonly creatingStudent = computed(() => this.createRoles().includes(AppRoles.Student));
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly departmentsError = signal<string | null>(null);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly editingUser = signal<UserDto | null>(null);
  protected readonly editRoles = signal<string[]>([]);
  protected readonly editSubmitting = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    fullName: ['', [Validators.required]],
    studentNumber: [''],
    departmentId: [''],
    firstName: [''],
    middleName: [''],
    lastName: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.usersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load users.');
        this.loading.set(false);
      },
    });
  }

  protected openCreateModal(): void {
    this.createForm.reset();
    this.createRoles.set([]);
    this.createError.set(null);
    this.showCreateModal.set(true);
    this.updateStudentValidators();
    this.loadDepartments();
  }

  protected loadDepartments(): void {
    this.departmentsError.set(null);
    this.departmentsService.list().subscribe({
      next: departments => this.departments.set(departments.filter(d => d.isActive)),
      error: () => this.departmentsError.set('Could not load departments.'),
    });
  }

  private updateStudentValidators(): void {
    const controls = this.createForm.controls;
    controls.fullName.setValidators(this.creatingStudent() ? [] : [Validators.required, Validators.maxLength(200)]);
    controls.studentNumber.setValidators(this.creatingStudent() ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(30)] : []);
    controls.departmentId.setValidators(this.creatingStudent() ? [Validators.required] : []);
    for (const control of [controls.firstName, controls.lastName])
      control.setValidators(this.creatingStudent() ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)] : []);
    controls.middleName.setValidators(this.creatingStudent() ? [Validators.maxLength(100)] : []);
    for (const control of Object.values(controls)) control.updateValueAndValidity();
  }

  protected toggleCreateRole(role: string, checked: boolean): void {
    this.createRoles.update((roles) =>
      checked ? [...roles, role] : roles.filter((r) => r !== role),
    );
    this.updateStudentValidators();
  }

  protected submitCreate(): void {
    if (this.createSubmitting()) return;
    if (this.createForm.invalid || this.createRoles().length === 0) {
      this.createForm.markAllAsTouched();
      if (this.createRoles().length === 0) {
        this.createError.set('Select at least one role.');
      }
      return;
    }

    this.createSubmitting.set(true);
    this.createError.set(null);

    this.usersService
      .create(this.creatingStudent()
        ? { ...this.createForm.getRawValue(), fullName: [this.createForm.controls.firstName.value.trim(), this.createForm.controls.middleName.value.trim(), this.createForm.controls.lastName.value.trim()].filter(Boolean).join(' '), roles: this.createRoles() }
        : { email: this.createForm.controls.email.value, password: this.createForm.controls.password.value, fullName: this.createForm.controls.fullName.value, roles: this.createRoles() })
      .subscribe({
        next: (user) => {
          this.users.update((users) => [...users, user]);
          this.createSubmitting.set(false);
          this.showCreateModal.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.createSubmitting.set(false);
          this.createError.set(this.extractErrorMessage(error, 'Could not create user.'));
        },
      });
  }

  protected openEditRoles(user: UserDto): void {
    this.editingUser.set(user);
    this.editRoles.set([...user.roles]);
    this.editError.set(null);
  }

  protected toggleEditRole(role: string, checked: boolean): void {
    this.editRoles.update((roles) => (checked ? [...roles, role] : roles.filter((r) => r !== role)));
  }

  protected submitEditRoles(): void {
    const user = this.editingUser();
    if (!user) return;

    if (this.editRoles().length === 0) {
      this.editError.set('A user needs at least one role.');
      return;
    }

    this.editSubmitting.set(true);
    this.editError.set(null);

    this.usersService.updateRoles(user.id, { roles: this.editRoles() }).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
        this.editSubmitting.set(false);
        this.editingUser.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.editSubmitting.set(false);
        this.editError.set(this.extractErrorMessage(error, 'Could not update roles.'));
      },
    });
  }

  protected toggleActive(user: UserDto): void {
    const action = user.isActive ? this.usersService.deactivate(user.id) : this.usersService.activate(user.id);
    action.subscribe({
      next: (updated) => this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u))),
      error: () => this.errorMessage.set(`Could not ${user.isActive ? 'deactivate' : 'activate'} ${user.email}.`),
    });
  }

  protected approve(user: UserDto): void {
    this.approvingId.set(user.id);
    this.errorMessage.set(null);

    this.usersService.activate(user.id).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
        this.approvingId.set(null);
      },
      error: () => {
        this.errorMessage.set(`Could not approve ${user.email}.`);
        this.approvingId.set(null);
      },
    });
  }

  protected openReject(user: UserDto): void {
    this.rejectingUser.set(user);
    this.rejectError.set(null);
  }

  protected confirmReject(): void {
    const user = this.rejectingUser();
    if (!user) return;

    this.rejectSubmitting.set(true);
    this.rejectError.set(null);

    this.usersService.reject(user.id).subscribe({
      next: () => {
        this.users.update((users) => users.filter((u) => u.id !== user.id));
        this.rejectSubmitting.set(false);
        this.rejectingUser.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.rejectSubmitting.set(false);
        this.rejectError.set(this.extractErrorMessage(error, 'Could not reject this account.'));
      },
    });
  }

  protected viewPhoto(user: UserDto): void {
    this.photoModalUser.set(user);
    this.photoModalUrl.set(null);
    this.photoModalError.set(null);
    this.photoLoadingId.set(user.id);

    this.usersService.getPhotoBlob(user.id).subscribe({
      next: (blob) => {
        this.photoModalUrl.set(URL.createObjectURL(blob));
        this.photoLoadingId.set(null);
      },
      error: () => {
        this.photoModalError.set('Could not load this photo.');
        this.photoLoadingId.set(null);
      },
    });
  }

  protected closePhotoModal(): void {
    const url = this.photoModalUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.photoModalUser.set(null);
    this.photoModalUrl.set(null);
    this.photoModalError.set(null);
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    if (errors) {
      return Object.values(errors).flat().join(' ');
    }
    return error.error?.detail ?? fallback;
  }
}
