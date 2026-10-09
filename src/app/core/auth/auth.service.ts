import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  AuthResponse,
  CurrentUser,
  LoginRequest,
  RegisterStudentRequest,
  RegisterStudentResponse,
} from '../models/auth.models';
import { TokenStorageService } from './token-storage.service';

/**
 * Single source of truth for "who is logged in" on the client. The access
 * token lives only in memory (see TokenStorageService for why); guards,
 * the auth interceptor, and feature components all read from the signals
 * here instead of touching storage directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  private accessToken = signal<string | null>(null);
  private accessTokenExpiresAtUtc = signal<Date | null>(null);
  private user = signal<CurrentUser | null>(this.tokenStorage.getStoredUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.accessToken() !== null && this.user() !== null);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  /**
   * Public student sign-up. No session is established - the account comes
   * back approved when on a Guidance master list, or pending manual approval.
   * Always sent as multipart/form-data (not JSON) since the API's /auth/register
   * endpoint accepts an optional 1x1 ID photo in the same request - see
   * back/Controllers/AuthController.cs's RegisterStudentFormDto. Angular's
   * HttpClient sets the multipart Content-Type/boundary automatically for a
   * FormData body; don't set it manually.
   */
  register(request: RegisterStudentRequest, photo: File | null): Observable<RegisterStudentResponse> {
    const formData = new FormData();
    formData.append('email', request.email);
    formData.append('password', request.password);
    formData.append('firstName', request.firstName);
    if (request.middleName) {
      formData.append('middleName', request.middleName);
    }
    formData.append('lastName', request.lastName);
    formData.append('studentNumber', request.studentNumber);
    formData.append('departmentId', request.departmentId);
    if (photo) {
      formData.append('photo', photo, photo.name);
    }

    return this.http.post<RegisterStudentResponse>(`${API_BASE_URL}/auth/register`, formData);
  }

  /** Attempts to restore a session on app startup using the persisted refresh token. */
  tryRestoreSession(): Observable<AuthResponse | null> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => this.setSession(response)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

  /** Used by the error interceptor to silently refresh once on a 401. */
  refresh(): Observable<AuthResponse | null> {
    return this.tryRestoreSession();
  }

  logout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    this.clearSession();

    if (refreshToken) {
      // Best-effort revoke; the UI has already logged the user out locally.
      this.http.post(`${API_BASE_URL}/auth/logout`, { refreshToken }).subscribe({ error: () => void 0 });
    }
  }

  private setSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.accessTokenExpiresAtUtc.set(new Date(response.accessTokenExpiresAtUtc));
    this.user.set(response.user);
    this.tokenStorage.setRefreshToken(response.refreshToken);
    this.tokenStorage.setStoredUser(response.user);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.accessTokenExpiresAtUtc.set(null);
    this.user.set(null);
    this.tokenStorage.clear();
  }
}
