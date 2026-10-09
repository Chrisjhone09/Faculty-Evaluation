import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/guidance`;

  getAnalytics(periodId?: string, departmentId?: string): Observable<GuidanceAnalyticsDto> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    if (departmentId) params = params.set('departmentId', departmentId);
    return this.http.get<GuidanceAnalyticsDto>(`${this.baseUrl}/analytics`, { params });
  }

  getSummary(): Observable<GuidanceSummaryDto> {
    return this.http.get<GuidanceSummaryDto>(`${this.baseUrl}/summary`);
  }

  getFacultyPerformance(): Observable<GuidanceFacultyPerformanceRowDto[]> {
    return this.http.get<GuidanceFacultyPerformanceRowDto[]>(`${this.baseUrl}/faculty-performance`);
  }

  getFacultyPerformanceDetail(instructorId: string): Observable<GuidanceFacultyPerformanceDetailDto> {
    return this.http.get<GuidanceFacultyPerformanceDetailDto>(`${this.baseUrl}/faculty-performance/${instructorId}/detail`);
  }

  getDepartmentPerformance(): Observable<GuidanceDepartmentPerformanceDto[]> {
    return this.http.get<GuidanceDepartmentPerformanceDto[]>(`${this.baseUrl}/department-performance`);
  }

  getFlaggedFaculty(): Observable<GuidanceFlaggedFacultyDto[]> {
    return this.http.get<GuidanceFlaggedFacultyDto[]>(`${this.baseUrl}/flagged-faculty`);
  }

  getComments(departmentId: string | null, instructorId: string | null): Observable<GuidanceCommentsResultDto> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }
    if (instructorId) {
      params = params.set('instructorId', instructorId);
    }
    return this.http.get<GuidanceCommentsResultDto>(`${this.baseUrl}/comments`, { params });
  }

  /** On-demand only - call this from a button click handler, never automatically. */
  generateFacultySummary(instructorId: string): Observable<GuidanceFacultySummaryDto> {
    return this.http.post<GuidanceFacultySummaryDto>(`${this.baseUrl}/faculty-performance/${instructorId}/summary`, {});
  }
}
