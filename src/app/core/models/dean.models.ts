/** Mirrors back/Application/Classes/ClassOfferingFeature.cs, ClassRequests/ClassRequestFeature.cs, Dean/DeanReportingFeature.cs. */

export const ClassOfferingStatus = {
  Active: 'Active',
  Archived: 'Archived',
} as const;
export type ClassOfferingStatusValue = (typeof ClassOfferingStatus)[keyof typeof ClassOfferingStatus];

export const ClassMembershipStatus = {
  Approved: 'Approved',
  Removed: 'Removed',
} as const;
export type ClassMembershipStatusValue = (typeof ClassMembershipStatus)[keyof typeof ClassMembershipStatus];

export const ClassMembershipSource = {
  DeanImport: 'DeanImport',
  InstructorRequestApproved: 'InstructorRequestApproved',
  ManualAdd: 'ManualAdd',
  InstructorImport: 'InstructorImport',
  GuidanceImport: 'GuidanceImport',
} as const;
export type ClassMembershipSourceValue = (typeof ClassMembershipSource)[keyof typeof ClassMembershipSource];

export const ClassRequestStatus = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type ClassRequestStatusValue = (typeof ClassRequestStatus)[keyof typeof ClassRequestStatus];

export interface ClassOfferingDto {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  sectionId: string;
  sectionCode: string;
  term: string;
  instructorId: string | null;
  instructorName: string | null;
  status: ClassOfferingStatusValue;
  studentCount: number;
  departmentId: string;
  departmentName: string;
}

export interface CreateClassOfferingRequest {
  subjectId: string;
  sectionId: string;
  term: string;
  instructorId: string | null;
}

export interface AssignInstructorRequest {
  instructorId: string;
}

export interface ClassMembershipDto {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  status: ClassMembershipStatusValue;
  source: ClassMembershipSourceValue;
  removedAtUtc: string | null;
  removalReason: string | null;
}

export interface AddStudentRequest {
  studentNumber: string;
}

export interface MasterlistRowResultDto {
  rowNumber: number;
  studentNumber: string;
  outcome: 'Valid' | 'Duplicate' | 'NotFound' | 'Malformed' | 'Ambiguous';
}

export interface MasterlistValidationReportDto {
  totalRows: number;
  valid: MasterlistRowResultDto[];
  duplicate: MasterlistRowResultDto[];
  notFound: MasterlistRowResultDto[];
  malformed: MasterlistRowResultDto[];
  ambiguous: MasterlistRowResultDto[];
}

export interface MasterlistImportResultDto {
  importedCount: number;
  skippedCount: number;
  pendingRegistrationCount?: number;
}

export interface ClassMasterlistEntryDto {
  id: string;
  studentNumber: string;
  isRegistered: boolean;
}

/** One active roster student's evaluation COMPLETION status - never the answer content/ratings. Dean-only. */
export interface ClassEvaluationStatusRowDto {
  studentId: string;
  studentNumber: string;
  studentName: string;
  submitted: boolean;
  submittedAtUtc: string | null;
}

export interface ClassEvaluationStatusDto {
  classOfferingId: string;
  evaluationPeriodId: string;
  evaluationPeriodName: string;
  totalStudents: number;
  submittedCount: number;
  students: ClassEvaluationStatusRowDto[];
}

export interface ClassRequestDto {
  id: string;
  instructorId: string;
  instructorName: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  sectionId: string;
  sectionCode: string;
  term: string;
  status: ClassRequestStatusValue;
  proposedStudentCount: number;
  rejectionReason: string | null;
  reviewedAtUtc: string | null;
  resultingClassOfferingId: string | null;
  createdAtUtc: string;
  departmentId: string;
  departmentName: string;
}

export interface CreateClassRequestRequest {
  subjectId: string;
  sectionId: string;
  term: string;
  proposedStudentNumbers: string[];
  instructorId?: string;
}

export interface CreateClassRequestResultDto {
  request: ClassRequestDto;
  skippedStudentNumbers: string[];
}

export interface RejectClassRequestRequest {
  reason: string;
}

export interface FacultyPerformanceRowDto {
  instructorId: string;
  instructorName: string;
  employeeNumber: string;
  activeOfferingsCount: number;
  totalStudentsCount: number;
  evaluationsSubmittedCount: number;
  /** Likert1to5 (1-5 scale) average only. */
  averageRating: number | null;
  /** RapidAppraisal (6-10 scale) average, reported separately - see back/Application/Dean/DeanReportingFeature.cs. */
  rapidAppraisalAverageRating: number | null;
  hasEvaluationData: boolean;
  meetsAnonymityThreshold: boolean;
}

export interface CategoryRatingDto {
  categoryId: string;
  categoryName: string;
  averageRating: number;
  ratingCount: number;
}

export interface QuestionRatingDto {
  questionId: string;
  questionText: string;
  averageRating: number;
  ratingCount: number;
}

/** commentText is the AI-reconstructed rewrite when isFlaggedNegative is true - never the raw original (Dean/Instructor-facing views never see it; see back/Domain/Entities/EvaluationAnswer.cs). */
export interface EvaluationCommentDto {
  commentText: string;
  isFlaggedNegative: boolean;
}

export interface FacultyPerformanceDetailDto {
  instructorId: string;
  instructorName: string;
  employeeNumber: string;
  evaluationsSubmittedCount: number;
  meetsAnonymityThreshold: boolean;
  /** Likert1to5 (1-5 scale) only. */
  overallAverageRating: number | null;
  categoryRatings: CategoryRatingDto[];
  questionRatings: QuestionRatingDto[];
  comments: EvaluationCommentDto[];
  /** RapidAppraisal (6-10 scale) average, reported separately. */
  rapidAppraisalAverageRating: number | null;
  rapidAppraisalComments: EvaluationCommentDto[];
}

/** Response of POST /api/{dean,guidance}/faculty-performance/{id}/summary - only ever fetched when the user clicks "Generate AI Summary", never automatically. */
export interface EvaluationSummaryResultDto {
  summary: string;
}

export interface OfferingsByTermDto {
  term: string;
  offeringCount: number;
  studentCount: number;
}

export interface DeanReportsSummaryDto {
  totalActiveOfferings: number;
  totalArchivedOfferings: number;
  totalInstructors: number;
  totalStudentsAcrossActiveOfferings: number;
  pendingClassRequests: number;
  offeringsByTerm: OfferingsByTermDto[];
  totalEvaluationsSubmitted: number;
  /** Likert1to5 (1-5 scale) only. */
  departmentAverageRating: number | null;
  /** RapidAppraisal (6-10 scale) average, reported separately. */
  rapidAppraisalDepartmentAverageRating: number | null;
  hasEvaluationData: boolean;
  meetsAnonymityThreshold: boolean;
}
