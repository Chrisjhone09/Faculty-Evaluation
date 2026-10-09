import { Icon } from '../../../shared/components/icon/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EvaluationFormDto } from '../../../core/models/evaluation.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminEvaluationFormsService } from '../services/admin-evaluation-forms.service';

@Component({
  selector: 'app-admin-evaluation-forms',
  imports: [Icon, ReactiveFormsModule, Modal, RouterLink],
  templateUrl: './admin-evaluation-forms.html',
})
export class AdminEvaluationForms implements OnInit {
  private readonly formsService = inject(AdminEvaluationFormsService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly workspaceRoot = inject(AuthService).currentUser()?.roles.includes('Guidance') ? '/guidance' : '/admin';

  protected readonly forms = signal<EvaluationFormDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly busyFormId = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.formsService.list().subscribe({
      next: (forms) => {
        this.forms.set(forms);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load evaluation forms.');
        this.loading.set(false);
      },
    });
  }

  protected questionCount(form: EvaluationFormDto): number {
    return form.categories.reduce((sum, c) => sum + c.questions.length, 0);
  }

  protected openCreateModal(): void {
    this.createForm.reset({ name: '', description: '' });
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
    this.formsService.create({ name: raw.name, description: raw.description || null }).subscribe({
      next: (form) => {
        this.forms.update((forms) => [...forms, form]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create evaluation form.');
      },
    });
  }

  protected toggleActive(form: EvaluationFormDto): void {
    this.busyFormId.set(form.id);
    this.errorMessage.set(null);

    this.formsService
      .update(form.id, { name: form.name, description: form.description, isActive: !form.isActive })
      .subscribe({
        next: (updated) => {
          // Activating one form deactivates every other one server-side - reload
          // the whole list so that's reflected instead of patching just this row.
          this.refresh();
          this.busyFormId.set(null);
        },
        error: () => {
          this.errorMessage.set(`Could not update "${form.name}".`);
          this.busyFormId.set(null);
        },
      });
  }

  protected deleteForm(form: EvaluationFormDto): void {
    if (!confirm(`Delete "${form.name}"? This removes all its categories and questions. This can't be undone.`)) {
      return;
    }

    this.busyFormId.set(form.id);
    this.errorMessage.set(null);

    this.formsService.delete(form.id).subscribe({
      next: () => {
        this.forms.update((forms) => forms.filter((f) => f.id !== form.id));
        this.busyFormId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.detail ?? `Could not delete "${form.name}".`);
        this.busyFormId.set(null);
      },
    });
  }
}
