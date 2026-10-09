import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  CreateEvaluationPeriodRequest,
  EvaluationPeriodDto,
  UpdateEvaluationPeriodRequest,
} from '../../../core/models/evaluation.models';

@Injectable({ providedIn: 'root' })
export class AdminEvaluationPeriodsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/evaluation-periods`;

  list(): Observable<EvaluationPeriodDto[]> {
    return this.http.get<EvaluationPeriodDto[]>(this.baseUrl);
  }

  create(request: CreateEvaluationPeriodRequest): Observable<EvaluationPeriodDto> {
    return this.http.post<EvaluationPeriodDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateEvaluationPeriodRequest): Observable<EvaluationPeriodDto> {
    return this.http.put<EvaluationPeriodDto>(`${this.baseUrl}/${id}`, request);
  }

  activate(id: string): Observable<EvaluationPeriodDto> {
    return this.http.post<EvaluationPeriodDto>(`${this.baseUrl}/${id}/activate`, {});
  }

  close(id: string): Observable<EvaluationPeriodDto> {
    return this.http.post<EvaluationPeriodDto>(`${this.baseUrl}/${id}/close`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
