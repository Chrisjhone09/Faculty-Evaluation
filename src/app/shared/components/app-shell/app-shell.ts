import { Component, DestroyRef, HostListener, Input, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Icon, IconName } from '../icon/icon';

export interface AppShellNavItem {
  label: string;
  /** Absolute route path. Omit for items that aren't wired up yet. */
  path?: string;
  icon?: IconName;
  comingSoon?: boolean;
  /**
   * Live count rendered as a pill, e.g. pending approvals awaiting action.
   * Set `alert` to colour it as something needing attention.
   */
  badge?: number | null;
  badgeAlert?: boolean;
  /**
   * Only highlight this item on an exact URL match. Use for a parent path
   * that would otherwise stay active while a child route is open.
   */
  exact?: boolean;
}

/** Optional grouping so long sidebars read as sections, not a flat wall. */
export interface AppShellNavGroup {
  label?: string;
  items: AppShellNavItem[];
}

/**
 * Application frame shared by every role: sidebar navigation, top bar with
 * the current section and user menu, and the routed content area.
 *
 * Responsive behaviour is a real adaptation rather than a shrink:
 *  - desktop: persistent sidebar, collapsible to icons to reclaim width
 *  - tablet/mobile: sidebar becomes an off-canvas drawer behind a menu
 *    button, and closes automatically on navigation
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  templateUrl: './app-shell.html',
  styleUrls: ['./navigation.css', './user-menu.css', './app-shell.css'],
})
export class AppShell {
  /** Role name shown under the product name, e.g. "Guidance". */
  @Input({ required: true }) title!: string;
  @Input() navItems: AppShellNavItem[] = [];
  /** Preferred over navItems when a role has enough destinations to group. */
  @Input() navGroups: AppShellNavGroup[] = [];
  @Input() showRouterOutlet = false;

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mobileNavOpen = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly userMenuOpen = signal(false);

  /** Normalises the two input shapes into one list the template renders. */
  protected readonly groups = computed<AppShellNavGroup[]>(() =>
    this.navGroups.length > 0 ? this.navGroups : [{ items: this.navItems }],
  );

  /** Label of the active nav item, shown in the top bar on small screens. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentSection = computed(() => {
    const url = this.currentUrl();
    const items = this.groups().flatMap((group) => group.items);
    const match = items
      .filter((item) => item.path && url.startsWith(item.path))
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];
    return match?.label ?? this.title;
  });

  protected readonly initials = computed(() => {
    const name = this.authService.currentUser()?.fullName ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  });

  constructor() {
    // Close the mobile drawer whenever navigation completes, so tapping a
    // link doesn't leave the overlay covering the page it opened.
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.mobileNavOpen.set(false);
      this.userMenuOpen.set(false);
    });
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
    this.userMenuOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    this.mobileNavOpen.set(false);
    this.userMenuOpen.set(false);
  }

  /** Clicking anywhere outside the user menu dismisses it. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.user-menu')) {
      this.userMenuOpen.set(false);
    }
  }

  protected logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
