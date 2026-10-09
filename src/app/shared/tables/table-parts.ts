import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Icon } from '../components/icon/icon';
import { SortDirection } from './table-state';

/**
 * Sortable column header button. Shows a direction arrow once sorted and a
 * faint affordance on hover, so sortable columns are discoverable without
 * cluttering every header with an icon.
 */
@Component({
  selector: 'app-sort-header',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="th-sort"
      [class.is-sorted]="direction !== null"
      (click)="toggled.emit()"
      [attr.aria-label]="'Sort by ' + label"
      [attr.aria-sort]="direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'"
    >
      {{ label }}
      <app-icon
        class="sort-icon"
        size="sm"
        [name]="direction === 'desc' ? 'arrow-down' : direction === 'asc' ? 'arrow-up' : 'sort'"
      />
    </button>
  `,
})
export class SortHeader {
  @Input({ required: true }) label!: string;
  @Input() direction: SortDirection | null = null;
  @Output() toggled = new EventEmitter<void>();
}

/**
 * Search box for a table toolbar. Instant (no debounce) because every list
 * in this app is already loaded client-side.
 */
@Component({
  selector: 'app-table-search',
  imports: [Icon],
  template: `
    <div class="search-field">
      <app-icon name="search" size="sm" />
      <input
        type="search"
        [value]="value"
        [placeholder]="placeholder"
        [attr.aria-label]="placeholder"
        (input)="changed.emit($any($event.target).value)"
      />
    </div>
  `,
})
export class TableSearch {
  @Input() value = '';
  @Input() placeholder = 'Search…';
  @Output() changed = new EventEmitter<string>();
}

/**
 * Pagination footer. Hidden entirely when everything fits on one page, so
 * short lists don't carry dead chrome.
 */
@Component({
  selector: 'app-pagination',
  imports: [Icon],
  template: `
    @if (pageCount > 1 || filteredCount > 0) {
      <div class="pagination">
        <span>
          Showing <strong class="tabular">{{ rangeStart }}</strong>&ndash;<strong class="tabular">{{ rangeEnd }}</strong>
          of <strong class="tabular">{{ filteredCount }}</strong> {{ filteredCount === 1 ? itemLabel : itemLabelPlural }}
        </span>

        @if (pageCount > 1) {
          <div class="pagination-pages">
            <button
              type="button"
              class="btn btn-sm btn-icon"
              [disabled]="page <= 1"
              (click)="previous.emit()"
              aria-label="Previous page"
            >
              <app-icon name="chevron-left" size="sm" />
            </button>
            <span class="tabular" style="padding: 0 var(--space-2);">Page {{ page }} of {{ pageCount }}</span>
            <button
              type="button"
              class="btn btn-sm btn-icon"
              [disabled]="page >= pageCount"
              (click)="next.emit()"
              aria-label="Next page"
            >
              <app-icon name="chevron-right" size="sm" />
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class Pagination {
  @Input() page = 1;
  @Input() pageCount = 1;
  @Input() rangeStart = 0;
  @Input() rangeEnd = 0;
  @Input() filteredCount = 0;
  @Input() itemLabel = 'result';
  @Input() itemLabelPlural = 'results';

  @Output() next = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
}
