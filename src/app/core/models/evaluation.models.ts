/** Mirrors back/Application/Evaluations/EvaluationFormFeature.cs and EvaluationPeriodFeature.cs. */

/** Must match back/Domain/Enums/QuestionType.cs (serialized as the string name, not the int, by System.Text.Json's enum converter... see note below). */
export const QuestionType = {
  Likert1to5: 'Likert1to5',
  Text: 'Text',
  /** 6-10 rating + required comment on the same question. Every form must have at least one. */
  RapidAppraisal: 'RapidAppraisal',
} as const;
export type QuestionTypeValue = (typeof QuestionType)[keyof typeof QuestionType];

/** Must match back/Domain/Constants/RapidAppraisal.cs. */
export const RAPID_APPRAISAL_MIN_RATING = 6;
export const RAPID_APPRAISAL_MAX_RATING = 10;

/** Must match back/Domain/Enums/EvaluationPeriodStatus.cs. */
export const EvaluationPeriodStatus = {
  Scheduled: 'Scheduled',
  Active: 'Active',
  Closed: 'Closed',
} as const;
export type EvaluationPeriodStatusValue = (typeof EvaluationPeriodStatus)[keyof typeof EvaluationPeriodStatus];

export interface EvaluationQuestionDto {
  id: string;
  text: string;
  questionType: QuestionTypeValue;
  displayOrder: number;
}

export interface EvaluationCategoryDto {
  id: string;
  name: string;
  displayOrder: number;
  questions: EvaluationQuestionDto[];
}

export interface EvaluationFormDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  categories: EvaluationCategoryDto[];
}

export interface CreateEvaluationFormRequest {
  name: string;
  description: string | null;
}

export interface UpdateEvaluationFormRequest {
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateEvaluationCategoryRequest {
  name: string;
  displayOrder: number;
}

export type UpdateEvaluationCategoryRequest = CreateEvaluationCategoryRequest;

export interface CreateEvaluationQuestionRequest {
  text: string;
  questionType: QuestionTypeValue;
  displayOrder: number;
}

export type UpdateEvaluationQuestionRequest = CreateEvaluationQuestionRequest;

export interface EvaluationPeriodDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: EvaluationPeriodStatusValue;
  evaluationFormId: string;
  evaluationFormName: string;
}

export interface CreateEvaluationPeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
  evaluationFormId: string;
}

export type UpdateEvaluationPeriodRequest = CreateEvaluationPeriodRequest;

/** Mirrors back/Application/Evaluations/StudentEvaluationFeature.cs. */

export interface StudentEvaluationDto {
  classMembershipId: string;
  classOfferingId: string;
  subjectCode: string;
  subjectTitle: string;
  sectionCode: string;
  term: string;
  instructorName: string;
  submittedAtUtc: string | null;
}

export interface StudentEvaluationsResultDto {
  hasActivePeriod: boolean;
  evaluationPeriodName: string | null;
  evaluationPeriodEndDate: string | null;
  pending: StudentEvaluationDto[];
  completed: StudentEvaluationDto[];
}

export interface EvaluationSubmissionFormDto {
  classMembershipId: string;
  evaluationPeriodId: string;
  subjectCode: string;
  subjectTitle: string;
  sectionCode: string;
  instructorName: string;
  categories: EvaluationCategoryDto[];
}

export interface SubmitEvaluationAnswerRequest {
  questionId: string;
  ratingValue: number | null;
  commentText: string | null;
}

export interface SubmitEvaluationRequest {
  classMembershipId: string;
  evaluationPeriodId: string;
  answers: SubmitEvaluationAnswerRequest[];
}

export interface SubmitEvaluationResultDto {
  evaluationId: string;
  submittedAtUtc: string;
}
