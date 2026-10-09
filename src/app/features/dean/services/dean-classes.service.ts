import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  AddStudentRequest,
  AssignInstructorRequest,
  ClassEvaluationStatusDto,
  ClassMembershipDto,
  ClassMasterlistEntryDto,
  ClassOfferingDto,
  CreateClassOfferingRequest,
  MasterlistImportResultDto,
  MasterlistValidationReportDto,
} from '../../../core/models/dean.models';

@Injectable({ providedIn: 'root' })
export class DeanClassesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/classes`;

  list(): Observable<ClassOfferingDto[]> {
    return this.http.get<ClassOfferingDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<ClassOfferingDto> {
    return this.http.get<ClassOfferingDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateClassOfferingRequest): Observable<ClassOfferingDto> {
    return this.http.post<ClassOfferingDto>(this.baseUrl, request);
  }

  assignInstructor(id: string, request: AssignInstructorRequest): Observable<ClassOfferingDto> {
    return this.http.post<ClassOfferingDto>(`${this.baseUrl}/${id}/assign-instructor`, request);
  }

  archive(id: string): Observable<ClassOfferingDto> {
    return this.http.post<ClassOfferingDto>(`${this.baseUrl}/${id}/archive`, {});
  }

  getStudents(id: string): Observable<ClassMembershipDto[]> {
    return this.http.get<ClassMembershipDto[]>(`${this.baseUrl}/${id}/students`);
  }

  addStudent(id: string, request: AddStudentRequest): Observable<ClassMembershipDto> {
    return this.http.post<ClassMembershipDto>(`${this.baseUrl}/${id}/students`, request);
  }

  removeStudent(id: string, studentId: string, reason: string | null): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/students/${studentId}`, { body: { reason } });
  }

  validateMasterlist(id: string, file: File): Observable<MasterlistValidationReportDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<MasterlistValidationReportDto>(`${this.baseUrl}/${id}/masterlist/validate`, formData);
  }

  importMasterlist(id: string, studentNumbers: string[]): Observable<MasterlistImportResultDto> {
    return this.http.post<MasterlistImportResultDto>(`${this.baseUrl}/${id}/masterlist/import`, { studentNumbers });
  }

  getMasterlist(id: string): Observable<ClassMasterlistEntryDto[]> {
    return this.http.get<ClassMasterlistEntryDto[]>(`${this.baseUrl}/${id}/masterlist`);
  }

  removeMasterlistEntry(id: string, entryId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/masterlist/${entryId}`);
  }

  /** Defaults to the currently active evaluation period when evaluationPeriodId is omitted. */
  getEvaluationStatus(id: string, evaluationPeriodId?: string): Observable<ClassEvaluationStatusDto> {
    const params: Record<string, string> = evaluationPeriodId ? { evaluationPeriodId } : {};
    return this.http.get<ClassEvaluationStatusDto>(`${this.baseUrl}/${id}/evaluation-status`, { params });
  }
}
