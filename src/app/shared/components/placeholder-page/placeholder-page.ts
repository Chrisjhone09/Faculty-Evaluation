import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Stand-in landing page for each role area until the corresponding feature
 * (Phase 2+) is built. Confirms end-to-end auth/routing/guard wiring: the
 * title comes from route data, and the signed-in user + their roles come
 * straight from AuthService, proving the JWT round-trip works.
 */
@Component({
  selector: 'app-placeholder-page',
  templateUrl: './placeholder-page.html',
  styleUrl: './placeholder-page.css',
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly authService = inject(AuthService);

  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;

  protected logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
