import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  ClassRequestDto,
  CreateClassRequestRequest,
  CreateClassRequestResultDto,
  MasterlistValidationReportDto,
} from '../../../core/models/dean.models';

@Injectable({ providedIn: 'root' })
export class InstructorClassRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/class-requests`;

  create(request: CreateClassRequestRequest): Observable<CreateClassRequestResultDto> {
    return this.http.post<CreateClassRequestResultDto>(this.baseUrl, request);
  }

  getMine(): Observable<ClassRequestDto[]> {
    return this.http.get<ClassRequestDto[]>(`${this.baseUrl}/mine`);
  }

  /** Validates a CSV masterlist before it's proposed on a new (not-yet-created) class request. */
  parseMasterlist(file: File): Observable<MasterlistValidationReportDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<MasterlistValidationReportDto>(`${this.baseUrl}/parse-masterlist`, formData);
  }
}
