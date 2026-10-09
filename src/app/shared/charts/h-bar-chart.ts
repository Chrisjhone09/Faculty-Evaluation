import { Component, Input, computed, signal } from '@angular/core';
import { ChartDatum, formatValue, seriesColor } from './chart-models';

/**
 * Horizontal bar chart - the right choice for rankings and for comparing
 * categories with long labels (department names, rating categories), where a
 * vertical chart would force rotated, unreadable text.
 *
 * Renders as a definition list rather than SVG: it stays perfectly readable
 * at any width, reflows on mobile for free, and the labels are real text for
 * screen readers.
 */
@Component({
  selector: 'app-h-bar-chart',
  template: `
    @if (bars().length === 0) {
      <p class="empty-state">No data to chart yet.</p>
    } @else {
      <div class="hbar" role="img" [attr.aria-label]="summary()">
        @for (bar of bars(); track bar.label) {
          <div class="hbar-row">
            <div class="hbar-head">
              <span class="hbar-label truncate" [title]="bar.label">
                @if (showRank) {
                  <span class="hbar-rank">{{ bar.rank }}</span>
                }
                {{ bar.label }}
              </span>
              <span class="hbar-value">
                {{ bar.display }}<span class="hbar-suffix">{{ valueSuffix }}</span>
              </span>
            </div>
            <div class="meter">
              <div class="meter-fill" [style.width.%]="bar.percent" [style.background]="bar.color"></div>
            </div>
            @if (bar.note) {
              <div class="hbar-note">{{ bar.note }}</div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .hbar { display: flex; flex-direction: column; gap: var(--space-3); }
      .hbar-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-3);
        margin-bottom: var(--space-1);
      }
      .hbar-label {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        display: inline-flex;
        align-items: baseline;
        gap: var(--space-2);
        min-width: 0;
      }
      .hbar-rank {
        font-size: var(--text-2xs);
        font-weight: var(--weight-bold);
        color: var(--color-text-subtle);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .hbar-value {
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        color: var(--color-text);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .hbar-suffix { color: var(--color-text-muted); font-weight: var(--weight-normal); }
      .hbar-note { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-1); }
    `,
  ],
})
export class HBarChart {
  @Input({ required: true }) set data(value: ChartDatum[]) {
    this._data.set(value ?? []);
  }
  /** Fixed scale max. Omit to scale to the largest value present. */
  @Input() max: number | null = null;
  @Input() valueSuffix = '';
  /** Rank numbers make the ordering explicit in a leaderboard. */
  @Input() showRank = false;
  /** Single colour for every bar, or leave null to cycle the ramp. */
  @Input() barColor: string | null = 'var(--color-chart-1)';
  @Input() ariaLabel = 'Bar chart';

  protected readonly _data = signal<ChartDatum[]>([]);

  private readonly effectiveMax = computed(() => {
    if (this.max !== null && this.max > 0) {
      return this.max;
    }
    const values = this._data().map((d) => d.value);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  });

  protected readonly bars = computed(() =>
    this._data().map((d, index) => ({
      ...d,
      rank: index + 1,
      display: formatValue(d.value),
      percent: Math.max(0, Math.min(100, (d.value / this.effectiveMax()) * 100)),
      color: d.color ?? this.barColor ?? seriesColor(index),
    })),
  );

  protected readonly summary = computed(
    () =>
      `${this.ariaLabel}. ` +
      this.bars()
        .map((b) => `${b.label}: ${b.display}${this.valueSuffix}`)
        .join(', '),
  );
}
