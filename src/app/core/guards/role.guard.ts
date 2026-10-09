import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Factory guard: roleGuard(['Admin']) only lets users through if their JWT
 * roles intersect the allowed list. Like authGuard, this is UX sugar - the
 * real enforcement is [Authorize(Roles = ...)] on the API controllers.
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    const allowed = user.roles.some((role) => allowedRoles.includes(role));
    if (!allowed) {
      router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  };
}
