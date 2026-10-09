import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  STUDENT_PHOTO_ALLOWED_TYPES,
  STUDENT_PHOTO_MAX_SIZE_BYTES,
} from '../../../core/models/auth.models';
import { PublicDepartment } from '../../../core/models/public.models';
import { PublicCatalogService } from '../../../core/services/public-catalog.service';

/**
 * Public student sign-up. Deliberately Student-only (no role field) - see
 * architecture review decision. The server decides whether a Guidance
 * master-list match activates the account or manual approval is needed.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly publicCatalogService = inject(PublicCatalogService);

  protected readonly departments = signal<PublicDepartment[]>([]);
  protected readonly departmentsError = signal<string | null>(null);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isApproved = signal(false);

  // --- 1x1 ID photo (optional) ---
  protected readonly photoFile = signal<File | null>(null);
  protected readonly photoPreviewUrl = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    middleName: ['', [Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    studentNumber: ['', [Validators.required, Validators.maxLength(30)]],
    departmentId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.publicCatalogService.listDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.departmentsError.set('Could not load the list of departments. Please refresh and try again.'),
    });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photoError.set(null);

    if (!file) {
      this.clearPhoto();
      return;
    }

    if (!STUDENT_PHOTO_ALLOWED_TYPES.includes(file.type)) {
      this.photoError.set('Photo must be a JPEG or PNG image.');
      this.clearPhoto(input);
      return;
    }

    if (file.size > STUDENT_PHOTO_MAX_SIZE_BYTES) {
      this.photoError.set(`Photo must be ${STUDENT_PHOTO_MAX_SIZE_BYTES / (1024 * 1024)} MB or smaller.`);
      this.clearPhoto(input);
      return;
    }

    this.revokePreview();
    this.photoFile.set(file);
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  protected removePhoto(input: HTMLInputElement): void {
    this.clearPhoto(input);
  }

  private clearPhoto(input?: HTMLInputElement): void {
    this.revokePreview();
    this.photoFile.set(null);
    this.photoPreviewUrl.set(null);
    if (input) {
      input.value = '';
    }
  }

  private revokePreview(): void {
    const existing = this.photoPreviewUrl();
    if (existing) {
      URL.revokeObjectURL(existing);
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.authService.register({ ...raw, middleName: raw.middleName.trim() || null }, this.photoFile()).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.isApproved.set(response.isApproved);
        this.successMessage.set(response.message);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.extractErrorMessage(error));
      },
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    if (errors) {
      return Object.values(errors).flat().join(' ');
    }
    if (error.status === 409) {
      return error.error?.detail ?? 'An account with that email or student number already exists.';
    }
    return error.error?.detail ?? 'Something went wrong creating your account. Please try again.';
  }
}
