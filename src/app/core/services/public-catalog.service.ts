import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { PublicDepartment } from '../models/public.models';

/** Anonymous, read-only catalog data used by public pages (e.g. the sign-up form's department picker). */
@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly http = inject(HttpClient);

  listDepartments(): Observable<PublicDepartment[]> {
    return this.http.get<PublicDepartment[]>(`${API_BASE_URL}/departments/public`);
  }
}
