import { Signal, WritableSignal, computed, signal } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

export interface SortState<TKey extends string = string> {
  key: TKey;
  direction: SortDirection;
}

/**
 * Signal-backed search / sort / pagination for a client-side list.
 *
 * Every list screen in the app shares this so filtering behaves identically
 * everywhere - same debounce-free instant search, same tri-state sort, same
 * page-size handling - instead of each page reinventing it.
 *
 * The API returns whole collections (departments, offerings, faculty rows),
 * so filtering client-side is correct here and keeps interactions instant.
 * If a collection ever outgrows that, swap this for server-side paging
 * without touching the templates.
 *
 * Usage:
 *   readonly table = createTableState(this.rows, {
 *     searchFields: (r) => [r.name, r.code],
 *     initialSort: { key: 'name', direction: 'asc' },
 *     comparators: { name: (a, b) => a.name.localeCompare(b.name) },
 *   });
 */
export interface TableStateOptions<T, TKey extends string> {
  /** Strings searched by the toolbar search box. */
  searchFields: (row: T) => (string | null | undefined)[];
  initialSort?: SortState<TKey>;
  /** Per-column comparators. Keys not listed fall back to string compare. */
  comparators?: Partial<Record<TKey, (a: T, b: T) => number>>;
  pageSize?: number;
  /** Extra predicates (dropdown filters, checkboxes) applied before search. */
  filters?: Signal<((row: T) => boolean)[]>;
}

export interface TableState<T, TKey extends string> {
  /** Read in templates; write via setSearch() so the page resets with it. */
  readonly search: WritableSignal<string>;
  readonly sort: WritableSignal<SortState<TKey> | null>;
  readonly page: WritableSignal<number>;
  readonly pageSize: WritableSignal<number>;

  /** Rows after filters + search + sort, before pagination. */
  readonly filtered: Signal<T[]>;
  /** The current page's rows - what the template renders. */
  readonly rows: Signal<T[]>;

  readonly totalCount: Signal<number>;
  readonly filteredCount: Signal<number>;
  readonly pageCount: Signal<number>;
  readonly rangeStart: Signal<number>;
  readonly rangeEnd: Signal<number>;
  readonly isFiltered: Signal<boolean>;

  /** Use from (input) handlers - resets to page 1 so results stay visible. */
  setSearch(term: string): void;
  toggleSort(key: TKey): void;
  sortDirectionFor(key: TKey): SortDirection | null;
  goToPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  clearSearch(): void;
}

export function createTableState<T, TKey extends string = string>(
  source: Signal<T[]>,
  options: TableStateOptions<T, TKey>,
): TableState<T, TKey> {
  const search = signal('');
  const sort = signal<SortState<TKey> | null>(options.initialSort ?? null);
  const page = signal(1);
  const pageSize = signal(options.pageSize ?? 15);

  const filtered = computed(() => {
    let rows = source();

    for (const predicate of options.filters?.() ?? []) {
      rows = rows.filter(predicate);
    }

    const term = search().trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        options
          .searchFields(row)
          .some((field) => (field ?? '').toLowerCase().includes(term)),
      );
    }

    const activeSort = sort();
    if (activeSort) {
      const comparator = options.comparators?.[activeSort.key];
      const sorted = [...rows].sort((a, b) => {
        const result = comparator
          ? comparator(a, b)
          : String((a as Record<string, unknown>)[activeSort.key] ?? '').localeCompare(
              String((b as Record<string, unknown>)[activeSort.key] ?? ''),
            );
        return activeSort.direction === 'asc' ? result : -result;
      });
      rows = sorted;
    }

    return rows;
  });

  const filteredCount = computed(() => filtered().length);
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredCount() / pageSize())));

  // Keep the page in range when filters shrink the result set.
  const safePage = computed(() => Math.min(page(), pageCount()));

  const rows = computed(() => {
    const start = (safePage() - 1) * pageSize();
    return filtered().slice(start, start + pageSize());
  });

  const rangeStart = computed(() => (filteredCount() === 0 ? 0 : (safePage() - 1) * pageSize() + 1));
  const rangeEnd = computed(() => Math.min(safePage() * pageSize(), filteredCount()));

  return {
    search,
    sort,
    page,
    pageSize,
    filtered,
    rows,
    totalCount: computed(() => source().length),
    filteredCount,
    pageCount,
    rangeStart,
    rangeEnd,
    isFiltered: computed(() => filteredCount() !== source().length),

    setSearch(term: string): void {
      search.set(term);
      page.set(1);
    },

    /** asc -> desc -> unsorted, so a column can always be reset. */
    toggleSort(key: TKey): void {
      const current = sort();
      if (!current || current.key !== key) {
        sort.set({ key, direction: 'asc' });
      } else if (current.direction === 'asc') {
        sort.set({ key, direction: 'desc' });
      } else {
        sort.set(null);
      }
      page.set(1);
    },

    sortDirectionFor(key: TKey): SortDirection | null {
      const current = sort();
      return current && current.key === key ? current.direction : null;
    },

    goToPage(target: number): void {
      page.set(Math.min(Math.max(1, target), pageCount()));
    },

    nextPage(): void {
      page.set(Math.min(safePage() + 1, pageCount()));
    },

    previousPage(): void {
      page.set(Math.max(safePage() - 1, 1));
    },

    clearSearch(): void {
      search.set('');
      page.set(1);
    },
  };
}
