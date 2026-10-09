import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Right-hand side panel for secondary detail that shouldn't cost a page
 * navigation - viewing a record, reviewing a request, inspecting results.
 *
 * Keeps the list behind it visible and preserves the user's scroll position
 * and filters, which a route change would throw away.
 *
 * Accessibility: renders as a modal dialog, closes on Escape, traps Tab
 * within the panel, and restores focus to the trigger on close.
 */
@Component({
  selector: 'app-drawer',
  imports: [Icon],
  template: `
    <div class="drawer-backdrop" (click)="requestClose()"></div>

    <aside
      class="drawer"
      [class.drawer-wide]="wide"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title"
    >
      <header class="drawer-header">
        <div>
          <div class="drawer-title">{{ title }}</div>
          @if (subtitle) {
            <div class="drawer-subtitle">{{ subtitle }}</div>
          }
        </div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="requestClose()" aria-label="Close panel">
          <app-icon name="x" size="sm" />
        </button>
      </header>

      <div class="drawer-body scroll-area">
        <ng-content />
      </div>

      @if (hasFooter) {
        <footer class="drawer-footer">
          <ng-content select="[slot=footer]" />
        </footer>
      }
    </aside>
  `,
})
export class Drawer implements AfterViewInit, OnDestroy {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() wide = false;
  /** Set when projecting footer content, so the footer band isn't empty. */
  @Input() hasFooter = false;

  @Output() closed = new EventEmitter<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly previouslyFocused = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    // Move focus into the panel so screen readers and keyboards land here.
    this.focusable()[0]?.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus?.();
  }

  @HostListener('document:keydown.escape')
  protected requestClose(): void {
    this.closed.emit();
  }

  /** Simple focus trap - Tab cycles within the drawer while it's open. */
  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const items = this.focusable();
    if (items.length === 0) {
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusable(): HTMLElement[] {
    const candidates = this.host.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    // offsetParent is null for display:none (and detached) elements, which keeps
    // hidden projected content out of the initial-focus and Tab-trap targets.
    return Array.from(candidates).filter((el) => el.offsetParent !== null);
  }
}
