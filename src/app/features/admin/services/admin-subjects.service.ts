import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { CreateSubjectRequest, SubjectDto, UpdateSubjectRequest } from '../../../core/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminSubjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/subjects`;

  list(): Observable<SubjectDto[]> {
    return this.http.get<SubjectDto[]>(this.baseUrl);
  }

  create(request: CreateSubjectRequest): Observable<SubjectDto> {
    return this.http.post<SubjectDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateSubjectRequest): Observable<SubjectDto> {
    return this.http.put<SubjectDto>(`${this.baseUrl}/${id}`, request);
  }
}
