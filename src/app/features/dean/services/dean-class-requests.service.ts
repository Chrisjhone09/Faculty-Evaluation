import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { ClassRequestDto, RejectClassRequestRequest } from '../../../core/models/dean.models';

/** Dean-side of /api/class-requests (approve/reject queue). See InstructorClassRequestsService for the Instructor-side create/mine calls. */
@Injectable({ providedIn: 'root' })
export class DeanClassRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/class-requests`;

  list(): Observable<ClassRequestDto[]> {
    return this.http.get<ClassRequestDto[]>(this.baseUrl);
  }

  approve(id: string): Observable<ClassRequestDto> {
    return this.http.post<ClassRequestDto>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: string, request: RejectClassRequestRequest): Observable<ClassRequestDto> {
    return this.http.post<ClassRequestDto>(`${this.baseUrl}/${id}/reject`, request);
  }
}
