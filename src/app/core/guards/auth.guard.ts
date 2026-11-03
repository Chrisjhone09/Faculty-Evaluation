import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Client-side gate only - every protected API endpoint enforces
 * authorization server-side too (architecture doc §17). This guard exists
 * purely so unauthenticated users get an instant redirect instead of a
 * flash of a page that will just 401.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate([state.url.startsWith('/guidance') ? '/guidance/login' : '/student/login']);
  return false;
};
