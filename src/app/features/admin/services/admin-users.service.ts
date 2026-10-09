import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { CreateUserRequest, UpdateUserRolesRequest, UserDto } from '../../../core/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/users`;

  list(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.baseUrl);
  }

  create(request: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(this.baseUrl, request);
  }

  updateRoles(id: string, request: UpdateUserRolesRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.baseUrl}/${id}/roles`, request);
  }

  activate(id: string): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  /** Permanently deletes an inactive account (and its linked Student record, if any). */
  reject(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/reject`, {});
  }

  /**
   * Fetched as a blob (not a plain <img src>) since the endpoint is
   * Admin-only and needs the Authorization header the auth interceptor
   * attaches to HttpClient requests - a raw <img> tag can't send that
   * header. Caller turns the blob into an object URL for display.
   */
  getPhotoBlob(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/photo`, { responseType: 'blob' });
  }
}
