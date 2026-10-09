import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EvaluationCategoryDto,
  EvaluationSubmissionFormDto,
  QuestionType,
  RAPID_APPRAISAL_MAX_RATING,
  RAPID_APPRAISAL_MIN_RATING,
  SubmitEvaluationAnswerRequest,
} from '../../../core/models/evaluation.models';
import { StudentEvaluationsService } from '../services/student-evaluations.service';

interface AnswerState {
  ratingValue: number | null;
  commentText: string;
}

/** Renders the active EvaluationForm's categories/questions for one pending class and submits POST /api/evaluations (architecture doc §6.2). */
@Component({
  selector: 'app-student-evaluate',
  imports: [RouterLink],
  templateUrl: './student-evaluate.html',
})
export class StudentEvaluate implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly evaluationsService = inject(StudentEvaluationsService);

  protected readonly QuestionType = QuestionType;
  protected readonly ratingScale = [1, 2, 3, 4, 5];
  protected readonly rapidAppraisalScale = Array.from(
    { length: RAPID_APPRAISAL_MAX_RATING - RAPID_APPRAISAL_MIN_RATING + 1 },
    (_, i) => RAPID_APPRAISAL_MIN_RATING + i,
  );

  private readonly classMembershipId = this.route.snapshot.paramMap.get('classMembershipId')!;

  protected readonly form = signal<EvaluationSubmissionFormDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly answers = signal<Record<string, AnswerState>>({});
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  ngOnInit(): void {
    this.evaluationsService.getSubmissionForm(this.classMembershipId).subscribe({
      next: (form) => {
        this.form.set(form);
        const initial: Record<string, AnswerState> = {};
        for (const category of form.categories) {
          for (const question of category.questions) {
            initial[question.id] = { ratingValue: null, commentText: '' };
          }
        }
        this.answers.set(initial);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadError.set(error.error?.detail ?? 'Could not load this evaluation form.');
        this.loading.set(false);
      },
    });
  }

  protected setRating(questionId: string, value: number): void {
    this.answers.update((current) => ({ ...current, [questionId]: { ...current[questionId], ratingValue: value } }));
  }

  protected setComment(questionId: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.answers.update((current) => ({ ...current, [questionId]: { ...current[questionId], commentText: value } }));
  }

  protected allCategories(): EvaluationCategoryDto[] {
    return this.form()?.categories ?? [];
  }

  protected submit(): void {
    const form = this.form();
    if (!form) return;

    this.submitError.set(null);
    this.fieldErrors.set({});

    const currentAnswers = this.answers();
    const answers: SubmitEvaluationAnswerRequest[] = form.categories
      .flatMap((c) => c.questions)
      .map((q) => {
        const state = currentAnswers[q.id];
        return {
          questionId: q.id,
          ratingValue:
            q.questionType === QuestionType.Likert1to5 || q.questionType === QuestionType.RapidAppraisal
              ? state.ratingValue
              : null,
          commentText:
            q.questionType === QuestionType.Text || q.questionType === QuestionType.RapidAppraisal
              ? state.commentText.trim() || null
              : null,
        };
      });

    this.submitting.set(true);

    this.evaluationsService
      .submit({ classMembershipId: form.classMembershipId, evaluationPeriodId: form.evaluationPeriodId, answers })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          if (error.status === 400 && error.error?.errors) {
            this.fieldErrors.set(this.flattenErrors(error.error.errors));
            this.submitError.set('Please answer every question before submitting.');
          } else {
            this.submitError.set(error.error?.detail ?? 'Could not submit this evaluation.');
          }
        },
      });
  }

  protected backToDashboard(): void {
    this.router.navigateByUrl('/student/dashboard');
  }

  private flattenErrors(errors: Record<string, string[]>): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const [key, messages] of Object.entries(errors)) {
      flat[key] = messages[0];
    }
    return flat;
  }
}
