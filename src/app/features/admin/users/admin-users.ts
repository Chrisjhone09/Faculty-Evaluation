import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDto } from '../../../core/models/admin.models';
import { Icon } from '../../../shared/components/icon/icon';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminUsersService } from '../services/admin-users.service';

@Component({ selector: 'app-admin-users', imports: [Icon, Modal, ReactiveFormsModule], templateUrl: './admin-users.html' })
export class AdminUsers implements OnInit {
  private readonly service = inject(AdminUsersService);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly modal = signal(false);
  protected readonly busy = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]],
  });
  ngOnInit(): void { this.refresh(); }
  private refresh(): void { this.service.list().subscribe({
    next: users => { this.users.set(users.filter(u => u.roles.includes('Guidance'))); this.loading.set(false); },
    error: () => { this.error.set('Could not load Guidance accounts.'); this.loading.set(false); },
  }); }
  protected open(): void { this.form.reset(); this.error.set(''); this.modal.set(true); }
  protected save(): void {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set('');
    this.service.create({ ...this.form.getRawValue(), roles: ['Guidance'] }).subscribe({
      next: () => { this.busy.set(false); this.modal.set(false); this.refresh(); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.error?.errors ? Object.values(e.error.errors as Record<string, string[]>).flat().join(' ') : e.error?.detail ?? 'Could not create account.');
      },
    });
  }
  protected toggle(user: UserDto): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    (user.isActive ? this.service.deactivate(user.id) : this.service.activate(user.id)).subscribe({
      next: () => { this.busy.set(false); this.refresh(); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.error?.detail ?? 'Could not update account.'); },
    });
  }
}
