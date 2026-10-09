import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Restores a session from the persisted refresh token (if any) before
    // the app renders, so a page reload doesn't bounce a logged-in user to
    // /login while the first API call is still in flight.
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return new Promise<void>((resolve) => {
        authService.tryRestoreSession().subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
    }),
  ]
};
