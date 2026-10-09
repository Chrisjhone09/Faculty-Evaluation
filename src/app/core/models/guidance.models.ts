/** Mirrors back/Application/Guidance/GuidanceReportingFeature.cs. */
import { CategoryRatingDto, QuestionRatingDto } from './dean.models';
import { QuestionTypeValue } from './evaluation.models';

export interface GuidanceFacultyPerformanceRowDto {
  instructorId: string;
  instructorName: string;
  employeeNumber: string;
  departmentId: string;
  departmentName: string;
  evaluationsSubmittedCount: number;
  /** Likert1to5 (1-5 scale) average only. */
  averageRating: number | null;
  /** RapidAppraisal (6-10 scale) average, reported separately. */
  rapidAppraisalAverageRating: number | null;
  hasEvaluationData: boolean;
  meetsAnonymityThreshold: boolean;
  isFlagged: boolean;
}

/**
 * commentText is the same display text Dean sees (AI-reconstructed rewrite
 * when isFlaggedNegative, otherwise the original). originalCommentText is
 * populated ONLY when isFlaggedNegative is true - that's the "show original
 * comment" capability Guidance (and only Guidance) has. Render commentText
 * by default and offer a "Show original" toggle only when
 * originalCommentText isn't null.
 */
export interface GuidanceEvaluationCommentDto {
  commentText: string;
  isFlaggedNegative: boolean;
  originalCommentText: string | null;
}

export interface GuidanceFacultyPerformanceDetailDto {
  savedSummary: GuidanceFacultySummaryDto | null;
  respondentCount: number;
  ratingDistribution: { rating: number; count: number }[];
  periodPerformance: { periodId: string; periodName: string; submittedCount: number; respondentCount: number; averageRating: number | null; rapidAppraisalAverageRating: number | null; scoresProtected: boolean }[];
  instructorId: string;
  instructorName: string;
  employeeNumber: string;
  departmentId: string;
  departmentName: string;
  evaluationsSubmittedCount: number;
  meetsAnonymityThreshold: boolean;
  overallAverageRating: number | null;
  categoryRatings: CategoryRatingDto[];
  questionRatings: QuestionRatingDto[];
  comments: GuidanceEvaluationCommentDto[];
  rapidAppraisalAverageRating: number | null;
  rapidAppraisalComments: GuidanceEvaluationCommentDto[];
  isFlagged: boolean;
  flagReason: string | null;
}

export interface GuidanceFacultySummaryDto {
  summary: string;
  generatedAtUtc: string;
  evaluationCount: number;
  respondentCount: number;
}

export interface GuidanceDepartmentPerformanceDto {
  departmentId: string;
  departmentName: string;
  instructorCount: number;
  evaluationsSubmittedCount: number;
  averageRating: number | null;
  rapidAppraisalAverageRating: number | null;
  hasEvaluationData: boolean;
  meetsAnonymityThreshold: boolean;
  flaggedFacultyCount: number;
}

export interface GuidanceSummaryDto {
  totalDepartments: number;
  totalInstructors: number;
  totalEvaluationsSubmitted: number;
  overallAverageRating: number | null;
  rapidAppraisalOverallAverageRating: number | null;
  hasEvaluationData: boolean;
  meetsAnonymityThreshold: boolean;
  flaggedFacultyCount: number;
}

export interface GuidanceFlaggedFacultyDto {
  instructorId: string;
  instructorName: string;
  employeeNumber: string;
  departmentId: string;
  departmentName: string;
  evaluationsSubmittedCount: number;
  averageRating: number | null;
  rapidAppraisalAverageRating: number | null;
  reason: string;
}

/** Same display-vs-original rule as GuidanceEvaluationCommentDto above. */
export interface GuidanceCommentDto {
  instructorId: string;
  instructorName: string;
  departmentId: string;
  departmentName: string;
  questionText: string;
  questionType: QuestionTypeValue;
  commentText: string;
  isFlaggedNegative: boolean;
  originalCommentText: string | null;
}

export interface GuidanceCommentsResultDto {
  comments: GuidanceCommentDto[];
  minimumRespondents: number;
  hasProtectedComments: boolean;
}

/** Mirrors back/Domain/Constants/FacultyFlagging.cs. Display-only - the API applies these server-side. */
export const FACULTY_FLAGGING_LOW_RATING_THRESHOLD = 3.0;
export const FACULTY_FLAGGING_LOW_RAPID_APPRAISAL_THRESHOLD = 7.0;

export interface GuidanceAnalyticsDto {
  submittedStudents: number;
  eligibleStudents: number;
  periodId: string | null;
  periodName: string;
  periods: { id: string; name: string; status: string }[];
  activeClasses: number;
  pendingRequests: number;
  pendingAccounts: number;
  eligible: number;
  completed: number;
  submitted: number;
  averageRating: number | null;
  rapidAppraisalAverageRating: number | null;
  trend: { date: string; count: number }[];
  departments: {
    id: string; name: string; facultyCount: number; submitted: number;
    eligible: number; completed: number; averageRating: number | null;
    rapidAppraisalAverageRating: number | null;
  }[];
}
