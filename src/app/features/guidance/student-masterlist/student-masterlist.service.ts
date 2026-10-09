import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api-config';

export interface StudentMasterlistEntry { id: string; studentNumber: string; isRegistered: boolean; }
export interface StudentMasterlistRow { rowNumber: number; studentNumber: string; }
export interface StudentMasterlistValidation {
  totalRows: number;
  valid: StudentMasterlistRow[];
  duplicate: StudentMasterlistRow[];
  malformed: StudentMasterlistRow[];
}
export interface StudentMasterlistImportResult { importedCount: number; skippedCount: number; }

@Injectable({ providedIn: 'root' })
export class StudentMasterlistService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/student-masterlist`;
  list() { return this.http.get<StudentMasterlistEntry[]>(this.url); }
  validate(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<StudentMasterlistValidation>(`${this.url}/validate`, form);
  }
  import(studentNumbers: string[]) {
    return this.http.post<StudentMasterlistImportResult>(`${this.url}/import`, { studentNumbers });
  }
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
