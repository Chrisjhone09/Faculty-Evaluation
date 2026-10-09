import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { AuthService } from '../auth/auth.service';

/**
 * On a 401 from our API, attempts exactly one silent refresh and retries the
 * original request. If the refresh also fails, the session is cleared and
 * the user is bounced to /login. This is the only place a 401 is handled -
 * individual components/services never need their own retry logic.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(API_BASE_URL) &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        return authService.refresh().pipe(
          switchMap((response) => {
            if (!response) {
              router.navigate(['/login']);
              return throwError(() => error);
            }

            const token = authService.getAccessToken();
            const retried = req.clone({
              setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return next(retried);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
