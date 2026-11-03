import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-student-login', imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="login-page">
    <form class="login-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <img class="school-logo" src="/school-logo.png" alt="Colegio de Kidapawan, Inc. logo" width="88" height="88" />
      <h1>Faculty Evaluation</h1><p class="subtitle">Student Login</p>
      <label for="studentNumber">Student ID</label>
      <input id="studentNumber" type="text" formControlName="studentNumber" autocomplete="username" maxlength="30" />
      @if (form.controls.studentNumber.invalid && form.controls.studentNumber.touched) { <p class="field-error">Enter your Student ID.</p> }
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <button type="submit" [disabled]="busy()">{{ busy() ? 'Signing in...' : 'Sign in' }}</button>
      <p class="switch-link"><a routerLink="/guidance/login">Guidance login</a></p>
    </form>
  </div>`,
  styleUrl: '../login/login.css',
})
export class StudentLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly form = inject(FormBuilder).nonNullable.group({ studentNumber: ['', Validators.required] });
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected submit(): void {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set('');
    this.auth.studentLogin(this.form.getRawValue().studentNumber.trim()).subscribe({
      next: () => { this.busy.set(false); this.router.navigateByUrl('/student'); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.status === 429 ? 'Too many login attempts. Try again in a minute.'
          : e.status === 401 ? 'Student ID was not found or the account is inactive.'
          : 'Unable to sign in. Please try again.');
      },
    });
  }
}
