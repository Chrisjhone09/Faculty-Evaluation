import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  FeedbackSummaryDto,
  GuidanceAnalyticsDto,
  GuidanceCommentsResultDto,
  GuidanceDepartmentPerformanceDto,
  GuidanceFacultyPerformanceDetailDto,
  GuidanceFacultyPerformanceRowDto,
  GuidanceFacultySummaryDto,
  GuidanceFlaggedFacultyDto,
  GuidanceSummaryDto,
} from '../../../core/models/guidance.models';

@Injectable({ providedIn: 'root' })
export class GuidanceReportingService {
  getFeedbackSummary(instructorId: string, periodId?: string): Observable<FeedbackSummaryDto | null> {
    return this.http.get<FeedbackSummaryDto | null>(`${this.baseUrl}/faculty-performance/${instructorId}/feedback-summary`, { params: periodId ? { periodId } : {} });
  }
  generateFeedbackSummary(instructorId: string, periodId?: string): Observable<FeedbackSummaryDto> {
    return this.http.post<FeedbackSummaryDto>(`${this.baseUrl}/faculty-performance/${instructorId}/feedback-summary`, {}, { params: periodId ? { periodId } : {} });
  }
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/guidance`;

  getAnalytics(periodId?: string, departmentId?: string): Observable<GuidanceAnalyticsDto> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    if (departmentId) params = params.set('departmentId', departmentId);
    return this.http.get<GuidanceAnalyticsDto>(`${this.baseUrl}/analytics`, { params });
  }

  getSummary(periodId?: string): Observable<GuidanceSummaryDto> {
    return this.http.get<GuidanceSummaryDto>(`${this.baseUrl}/summary`, { params: periodId ? { periodId } : {} });
  }

  getFacultyPerformance(periodId?: string): Observable<GuidanceFacultyPerformanceRowDto[]> {
    return this.http.get<GuidanceFacultyPerformanceRowDto[]>(`${this.baseUrl}/faculty-performance`, { params: periodId ? { periodId } : {} });
  }

  getFacultyPerformanceDetail(instructorId: string, periodId?: string): Observable<GuidanceFacultyPerformanceDetailDto> {
    return this.http.get<GuidanceFacultyPerformanceDetailDto>(`${this.baseUrl}/faculty-performance/${instructorId}/detail`, { params: periodId ? { periodId } : {} });
  }

  getDepartmentPerformance(periodId?: string): Observable<GuidanceDepartmentPerformanceDto[]> {
    return this.http.get<GuidanceDepartmentPerformanceDto[]>(`${this.baseUrl}/department-performance`, { params: periodId ? { periodId } : {} });
  }

  getFlaggedFaculty(periodId?: string): Observable<GuidanceFlaggedFacultyDto[]> {
    return this.http.get<GuidanceFlaggedFacultyDto[]>(`${this.baseUrl}/flagged-faculty`, { params: periodId ? { periodId } : {} });
  }

  getComments(departmentId: string | null, instructorId: string | null, periodId?: string): Observable<GuidanceCommentsResultDto> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }
    if (instructorId) {
      params = params.set('instructorId', instructorId);
    }
    return this.http.get<GuidanceCommentsResultDto>(`${this.baseUrl}/comments`, { params });
  }

  /** On-demand only - call this from a button click handler, never automatically. */
  generateFacultySummary(instructorId: string, periodId?: string): Observable<GuidanceFacultySummaryDto> {
    return this.http.post<GuidanceFacultySummaryDto>(`${this.baseUrl}/faculty-performance/${instructorId}/summary`, {}, { params: periodId ? { periodId } : {} });
  }
}
