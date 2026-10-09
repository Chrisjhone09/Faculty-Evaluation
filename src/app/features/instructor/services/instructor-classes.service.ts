import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  AddStudentRequest,
  ClassMembershipDto,
  ClassOfferingDto,
  MasterlistImportResultDto,
  MasterlistValidationReportDto,
} from '../../../core/models/dean.models';

/**
 * Instructor-facing access to /api/classes - the endpoints are shared with
 * DeanClassesService (role-gated server-side to "your own assigned class
 * only"). RemoveStudent stays Dean-only and is intentionally not exposed here.
 */
@Injectable({ providedIn: 'root' })
export class InstructorClassesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/classes`;

  listMine(): Observable<ClassOfferingDto[]> {
    return this.http.get<ClassOfferingDto[]>(`${this.baseUrl}/mine`);
  }

  getById(id: string): Observable<ClassOfferingDto> {
    return this.http.get<ClassOfferingDto>(`${this.baseUrl}/${id}`);
  }

  getStudents(id: string): Observable<ClassMembershipDto[]> {
    return this.http.get<ClassMembershipDto[]>(`${this.baseUrl}/${id}/students`);
  }

  addStudent(id: string, request: AddStudentRequest): Observable<ClassMembershipDto> {
    return this.http.post<ClassMembershipDto>(`${this.baseUrl}/${id}/students`, request);
  }

  validateMasterlist(id: string, file: File): Observable<MasterlistValidationReportDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<MasterlistValidationReportDto>(`${this.baseUrl}/${id}/masterlist/validate`, formData);
  }

  importMasterlist(id: string, studentNumbers: string[]): Observable<MasterlistImportResultDto> {
    return this.http.post<MasterlistImportResultDto>(`${this.baseUrl}/${id}/masterlist/import`, { studentNumbers });
  }
}
