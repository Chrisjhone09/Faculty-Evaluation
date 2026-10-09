import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  DeanReportsSummaryDto,
  EvaluationSummaryResultDto,
  FacultyPerformanceDetailDto,
  FacultyPerformanceRowDto,
} from '../../../core/models/dean.models';

@Injectable({ providedIn: 'root' })
export class DeanReportingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/dean`;

  getFacultyPerformance(): Observable<FacultyPerformanceRowDto[]> {
    return this.http.get<FacultyPerformanceRowDto[]>(`${this.baseUrl}/faculty-performance`);
  }

  getFacultyPerformanceDetail(instructorId: string): Observable<FacultyPerformanceDetailDto> {
    return this.http.get<FacultyPerformanceDetailDto>(`${this.baseUrl}/faculty-performance/${instructorId}/detail`);
  }

  getReports(): Observable<DeanReportsSummaryDto> {
    return this.http.get<DeanReportsSummaryDto>(`${this.baseUrl}/reports`);
  }

  /** On-demand only - call this from a button click handler, never automatically. */
  generateFacultySummary(instructorId: string): Observable<EvaluationSummaryResultDto> {
    return this.http.post<EvaluationSummaryResultDto>(`${this.baseUrl}/faculty-performance/${instructorId}/summary`, {});
  }
}
