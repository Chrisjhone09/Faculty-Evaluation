import { Icon } from '../icon/icon';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/** Minimal content-projecting dialog reused by every create/edit form in the app. */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void { if (this.open) this.close(); }

  protected close(): void {
    this.closed.emit();
  }
}
