import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  EvaluationSubmissionFormDto,
  StudentEvaluationsResultDto,
  SubmitEvaluationRequest,
  SubmitEvaluationResultDto,
} from '../../../core/models/evaluation.models';

@Injectable({ providedIn: 'root' })
export class StudentEvaluationsService {
  private readonly http = inject(HttpClient);

  getMine(): Observable<StudentEvaluationsResultDto> {
    return this.http.get<StudentEvaluationsResultDto>(`${API_BASE_URL}/students/me/evaluations`);
  }

  getSubmissionForm(classMembershipId: string): Observable<EvaluationSubmissionFormDto> {
    return this.http.get<EvaluationSubmissionFormDto>(`${API_BASE_URL}/students/me/evaluations/${classMembershipId}/form`);
  }

  submit(request: SubmitEvaluationRequest): Observable<SubmitEvaluationResultDto> {
    return this.http.post<SubmitEvaluationResultDto>(`${API_BASE_URL}/evaluations`, request);
  }
}
