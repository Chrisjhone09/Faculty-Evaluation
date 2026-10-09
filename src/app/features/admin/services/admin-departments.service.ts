import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  AssignDeanRequest,
  CreateDepartmentRequest,
  DepartmentDto,
  UpdateDepartmentRequest,
} from '../../../core/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminDepartmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/departments`;

  list(): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(this.baseUrl);
  }

  create(request: CreateDepartmentRequest): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateDepartmentRequest): Observable<DepartmentDto> {
    return this.http.put<DepartmentDto>(`${this.baseUrl}/${id}`, request);
  }

  assignDean(id: string, request: AssignDeanRequest): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(`${this.baseUrl}/${id}/dean`, request);
  }
}
