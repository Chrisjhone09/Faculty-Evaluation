import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { CreateInstructorRequest, InstructorDto, UpdateInstructorRequest } from '../../../core/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminInstructorsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/instructors`;

  list(): Observable<InstructorDto[]> {
    return this.http.get<InstructorDto[]>(this.baseUrl);
  }

  create(request: CreateInstructorRequest): Observable<InstructorDto> {
    return this.http.post<InstructorDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateInstructorRequest): Observable<InstructorDto> {
    return this.http.put<InstructorDto>(`${this.baseUrl}/${id}`, request);
  }
}
