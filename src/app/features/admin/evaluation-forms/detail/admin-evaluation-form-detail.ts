import { AuthService } from '../../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EvaluationCategoryDto,
  EvaluationFormDto,
  EvaluationQuestionDto,
  QuestionType,
  QuestionTypeValue,
} from '../../../../core/models/evaluation.models';
import { Modal } from '../../../../shared/components/modal/modal';
import { AdminEvaluationFormsService } from '../../services/admin-evaluation-forms.service';

@Component({
  selector: 'app-admin-evaluation-form-detail',
  imports: [ReactiveFormsModule, Modal, RouterLink],
  templateUrl: './admin-evaluation-form-detail.html',
})
export class AdminEvaluationFormDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formsService = inject(AdminEvaluationFormsService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly workspaceRoot = inject(AuthService).currentUser()?.roles.includes('Guidance') ? '/guidance' : '/admin';

  protected readonly questionTypes = Object.values(QuestionType);

  protected readonly form = signal<EvaluationFormDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formId = this.route.snapshot.paramMap.get('id')!;

  // --- Edit form details ---
  protected readonly showEditFormModal = signal(false);
  protected readonly editFormSubmitting = signal(false);
  protected readonly editFormError = signal<string | null>(null);
  protected readonly editFormGroup = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    isActive: [false],
  });

  // --- Category create/edit ---
  protected readonly categoryModalMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingCategory = signal<EvaluationCategoryDto | null>(null);
  protected readonly categorySubmitting = signal(false);
  protected readonly categoryError = signal<string | null>(null);
  protected readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
  });

  // --- Question create/edit ---
  protected readonly questionModalCategoryId = signal<string | null>(null);
  protected readonly editingQuestion = signal<EvaluationQuestionDto | null>(null);
  protected readonly questionSubmitting = signal(false);
  protected readonly questionError = signal<string | null>(null);
  protected readonly questionForm = this.formBuilder.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(500)]],
    questionType: ['Likert1to5' as QuestionTypeValue, [Validators.required]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly busyCategoryId = signal<string | null>(null);
  protected readonly busyQuestionId = signal<string | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.formsService.getById(this.formId).subscribe({
      next: (form) => {
        this.form.set(form);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load this evaluation form.');
        this.loading.set(false);
      },
    });
  }

  protected questionTypeLabel(type: QuestionTypeValue): string {
    switch (type) {
      case QuestionType.Likert1to5:
        return '1-5 rating';
      case QuestionType.RapidAppraisal:
        return 'Rapid Appraisal (6-10 + comment)';
      default:
        return 'Open text';
    }
  }

  // ---- Form details ----

  protected openEditForm(): void {
    const form = this.form();
    if (!form) return;
    this.editFormGroup.setValue({ name: form.name, description: form.description ?? '', isActive: form.isActive });
    this.editFormError.set(null);
    this.showEditFormModal.set(true);
  }

  protected submitEditForm(): void {
    if (this.editFormGroup.invalid) {
      this.editFormGroup.markAllAsTouched();
      return;
    }

    this.editFormSubmitting.set(true);
    this.editFormError.set(null);

    const raw = this.editFormGroup.getRawValue();
    this.formsService.update(this.formId, { name: raw.name, description: raw.description || null, isActive: raw.isActive }).subscribe({
      next: (updated) => {
        this.form.update((f) => (f ? { ...f, name: updated.name, description: updated.description, isActive: updated.isActive } : f));
        this.editFormSubmitting.set(false);
        this.showEditFormModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.editFormSubmitting.set(false);
        this.editFormError.set(error.error?.detail ?? 'Could not save changes.');
      },
    });
  }

  // ---- Categories ----

  protected openAddCategory(): void {
    const nextOrder = this.form()?.categories.length ?? 0;
    this.categoryForm.reset({ name: '', displayOrder: nextOrder });
    this.editingCategory.set(null);
    this.categoryError.set(null);
    this.categoryModalMode.set('create');
  }

  protected openEditCategory(category: EvaluationCategoryDto): void {
    this.categoryForm.setValue({ name: category.name, displayOrder: category.displayOrder });
    this.editingCategory.set(category);
    this.categoryError.set(null);
    this.categoryModalMode.set('edit');
  }

  protected closeCategoryModal(): void {
    this.categoryModalMode.set(null);
    this.editingCategory.set(null);
  }

  protected submitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.categorySubmitting.set(true);
    this.categoryError.set(null);
    const raw = this.categoryForm.getRawValue();
    const editing = this.editingCategory();

    const request$ = editing
      ? this.formsService.updateCategory(this.formId, editing.id, raw)
      : this.formsService.addCategory(this.formId, raw);

    request$.subscribe({
      next: () => {
        this.categorySubmitting.set(false);
        this.categoryModalMode.set(null);
        this.editingCategory.set(null);
        this.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.categorySubmitting.set(false);
        this.categoryError.set(error.error?.detail ?? 'Could not save this category.');
      },
    });
  }

  protected deleteCategory(category: EvaluationCategoryDto): void {
    if (!confirm(`Delete category "${category.name}" and all its questions?`)) return;

    this.busyCategoryId.set(category.id);
    this.errorMessage.set(null);

    this.formsService.deleteCategory(this.formId, category.id).subscribe({
      next: () => {
        this.busyCategoryId.set(null);
        this.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.busyCategoryId.set(null);
        this.errorMessage.set(error.error?.detail ?? `Could not delete "${category.name}".`);
      },
    });
  }

  // ---- Questions ----

  protected openAddQuestion(category: EvaluationCategoryDto): void {
    this.questionForm.reset({ text: '', questionType: QuestionType.Likert1to5, displayOrder: category.questions.length });
    this.editingQuestion.set(null);
    this.questionError.set(null);
    this.questionModalCategoryId.set(category.id);
  }

  protected openEditQuestion(category: EvaluationCategoryDto, question: EvaluationQuestionDto): void {
    this.questionForm.setValue({
      text: question.text,
      questionType: question.questionType,
      displayOrder: question.displayOrder,
    });
    this.editingQuestion.set(question);
    this.questionError.set(null);
    this.questionModalCategoryId.set(category.id);
  }

  protected closeQuestionModal(): void {
    this.questionModalCategoryId.set(null);
    this.editingQuestion.set(null);
  }

  protected submitQuestion(): void {
    const categoryId = this.questionModalCategoryId();
    if (!categoryId || this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      return;
    }

    this.questionSubmitting.set(true);
    this.questionError.set(null);
    const raw = this.questionForm.getRawValue();
    const editing = this.editingQuestion();

    const request$ = editing
      ? this.formsService.updateQuestion(this.formId, categoryId, editing.id, raw)
      : this.formsService.addQuestion(this.formId, categoryId, raw);

    request$.subscribe({
      next: () => {
        this.questionSubmitting.set(false);
        this.questionModalCategoryId.set(null);
        this.editingQuestion.set(null);
        this.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.questionSubmitting.set(false);
        this.questionError.set(error.error?.detail ?? 'Could not save this question.');
      },
    });
  }

  protected deleteQuestion(category: EvaluationCategoryDto, question: EvaluationQuestionDto): void {
    if (!confirm(`Delete question "${question.text}"?`)) return;

    this.busyQuestionId.set(question.id);
    this.errorMessage.set(null);

    this.formsService.deleteQuestion(this.formId, category.id, question.id).subscribe({
      next: () => {
        this.busyQuestionId.set(null);
        this.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.busyQuestionId.set(null);
        this.errorMessage.set(error.error?.detail ?? 'Could not delete this question.');
      },
    });
  }
}
