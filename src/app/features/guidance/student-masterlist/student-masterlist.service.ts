import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api-config';

export interface StudentRecord { studentNumber: string; firstName: string; middleName: string | null; lastName: string; }
export interface StudentMasterlistEntry extends StudentRecord { id: string; isRegistered: boolean; evaluationPeriodId: string; isActive: boolean; }
export interface StudentMasterlistRow extends StudentRecord { rowNumber: number; error: string | null; }
export interface StudentMasterlistValidation { totalRows: number; valid: StudentMasterlistRow[]; duplicate: StudentMasterlistRow[]; malformed: StudentMasterlistRow[]; }
export interface StudentMasterlistImportResult { importedCount: number; skippedCount: number; }

@Injectable({ providedIn: 'root' })
export class StudentMasterlistService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/student-masterlist`;
  list(periodId: string) { return this.http.get<StudentMasterlistEntry[]>(this.url, { params: { periodId } }); }
  validate(file: File, periodId: string) {
    const form = new FormData(); form.append('file', file);
    return this.http.post<StudentMasterlistValidation>(`${this.url}/validate`, form, { params: { periodId } });
  }
  import(students: StudentRecord[], evaluationPeriodId: string) {
    return this.http.post<StudentMasterlistImportResult>(`${this.url}/import`, { students, evaluationPeriodId });
  }
  save(id: string | null, periodId: string, student: StudentRecord) {
    return id ? this.http.put<StudentMasterlistEntry>(`${this.url}/${id}`, student, { params: { periodId } })
      : this.http.post<StudentMasterlistEntry>(this.url, student, { params: { periodId } });
  }
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
