import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api-config';

@Component({
  selector: 'app-account-settings', imports: [ReactiveFormsModule],
  template: `<section class="account-settings">
    <h2>Account settings</h2>
    <p class="account-intro">Manage your Guidance account and keep your password up to date.</p>
    <section class="account-card">
      <h2>Guidance account</h2><p>{{ auth.currentUser()?.fullName }} · {{ auth.currentUser()?.email }}</p>
      <h3>Change password</h3><p>Use at least 8 characters with uppercase and lowercase letters and a number. You will sign in again after saving.</p>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="form-field"><label for="current-password">Current password</label><input id="current-password" type="password" autocomplete="current-password" formControlName="currentPassword" maxlength="128" /></div>
        <div class="form-field"><label for="new-password">New password</label><input id="new-password" type="password" autocomplete="new-password" formControlName="newPassword" maxlength="128" /></div>
        <div class="form-field"><label for="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autocomplete="new-password" formControlName="confirmPassword" maxlength="128" /></div>
        @if (error()) { <div class="banner-error" role="alert">{{ error() }}</div> }
        <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ busy() ? 'Updating password…' : 'Change password' }}</button>
      </form>
    </section>`,
  styles: [`.account-card { max-width: 640px; padding: 28px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); } h2 { margin-top: 0; } h3 { margin-top: 30px; } p { color: var(--color-text-secondary); line-height: 1.7; } form { margin-top: 24px; } .form-field { margin-bottom: 22px; } input { width: 100%; }`],
})
export class AccountSettings {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', Validators.required],
  });
  protected save(): void {
    if (this.busy()) return;
    this.error.set('');
    const request = this.form.getRawValue();
    if (this.form.invalid || request.newPassword !== request.confirmPassword || request.newPassword === request.currentPassword) {
      this.form.markAllAsTouched();
      this.error.set('Enter your current password and matching new passwords of at least 8 characters. Choose a password different from your current password.'); return;
    }
    this.busy.set(true);
    this.http.put(`${API_BASE_URL}/guidance/account/password`, request).subscribe({
      next: () => { this.form.reset(); this.auth.logout(); void this.router.navigate(['/guidance/login'], { queryParams: { passwordChanged: true } }); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.error?.errors?.password?.join(' ') ?? e.error?.detail ?? e.error?.Detail ?? 'Could not change password.'); },
    });
  }
}
