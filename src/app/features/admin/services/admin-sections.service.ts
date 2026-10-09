import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { CreateSectionRequest, SectionDto, UpdateSectionRequest } from '../../../core/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminSectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/sections`;

  list(): Observable<SectionDto[]> {
    return this.http.get<SectionDto[]>(this.baseUrl);
  }

  create(request: CreateSectionRequest): Observable<SectionDto> {
    return this.http.post<SectionDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateSectionRequest): Observable<SectionDto> {
    return this.http.put<SectionDto>(`${this.baseUrl}/${id}`, request);
  }
}
