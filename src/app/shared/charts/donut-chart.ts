import { Component, Input, computed, signal } from '@angular/core';
import { ChartDatum, formatValue, seriesColor } from './chart-models';

/**
 * Donut chart for simple part-to-whole breakdowns only - completion rates,
 * sentiment splits, status distributions. Deliberately capped at a handful
 * of slices: beyond that a horizontal bar chart reads far better, so reach
 * for <app-h-bar-chart> instead.
 *
 * The centre shows the headline figure, which is usually the actual reason
 * the chart exists.
 */
@Component({
  selector: 'app-donut-chart',
  template: `
    @if (total() === 0) {
      <p class="empty-state">No data to chart yet.</p>
    } @else {
      <div class="donut-wrap">
        <svg
          class="donut"
          [attr.viewBox]="'0 0 ' + size + ' ' + size"
          role="img"
          [attr.aria-label]="summary()"
        >
          <circle
            [attr.cx]="center"
            [attr.cy]="center"
            [attr.r]="radius"
            fill="none"
            stroke="var(--color-chart-track)"
            [attr.stroke-width]="thickness"
          />
          @for (slice of slices(); track slice.label) {
            <circle
              [attr.cx]="center"
              [attr.cy]="center"
              [attr.r]="radius"
              fill="none"
              [attr.stroke]="slice.color"
              [attr.stroke-width]="thickness"
              [attr.stroke-dasharray]="slice.dashArray"
              [attr.stroke-dashoffset]="slice.dashOffset"
              stroke-linecap="butt"
              [attr.transform]="'rotate(-90 ' + center + ' ' + center + ')'"
            />
          }
        </svg>

        <div class="donut-center">
          <div class="donut-value">{{ centerValue }}</div>
          @if (centerLabel) {
            <div class="donut-label">{{ centerLabel }}</div>
          }
        </div>
      </div>

      @if (showLegend) {
        <ul class="donut-legend">
          @for (slice of slices(); track slice.label) {
            <li>
              <span class="donut-swatch" [style.background]="slice.color"></span>
              <span class="donut-legend-label truncate">{{ slice.label }}</span>
              <span class="donut-legend-value">{{ slice.display }}</span>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .donut-wrap { position: relative; display: flex; justify-content: center; }
      .donut { width: 100%; max-width: 170px; height: auto; display: block; }
      .donut circle { transition: stroke-dasharray var(--duration-slow) var(--ease-out); }
      .donut-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .donut-value {
        font-size: var(--text-2xl);
        font-weight: var(--weight-bold);
        color: var(--color-text);
        line-height: 1;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
      .donut-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        margin-top: var(--space-1);
        text-align: center;
      }
      .donut-legend {
        list-style: none;
        margin: var(--space-4) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .donut-legend li { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
      .donut-swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
      .donut-legend-label { color: var(--color-text-secondary); min-width: 0; flex: 1; }
      .donut-legend-value {
        color: var(--color-text);
        font-weight: var(--weight-semibold);
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class DonutChart {
  @Input({ required: true }) set data(value: ChartDatum[]) {
    this._data.set(value ?? []);
  }
  /** Big number in the middle - usually the figure the chart is about. */
  @Input() centerValue = '';
  @Input() centerLabel?: string;
  @Input() showLegend = true;
  @Input() ariaLabel = 'Breakdown';

  protected readonly size = 120;
  protected readonly thickness = 14;
  protected readonly center = 60;
  protected readonly radius = 60 - 14 / 2;

  protected readonly _data = signal<ChartDatum[]>([]);

  protected readonly total = computed(() => this._data().reduce((sum, d) => sum + Math.max(0, d.value), 0));

  private readonly circumference = computed(() => 2 * Math.PI * this.radius);

  protected readonly slices = computed(() => {
    const total = this.total();
    const circumference = this.circumference();
    let consumed = 0;

    return this._data().map((d, index) => {
      const value = Math.max(0, d.value);
      const fraction = total === 0 ? 0 : value / total;
      const length = fraction * circumference;

      const slice = {
        label: d.label,
        display: d.note ?? formatValue(value),
        color: d.color ?? seriesColor(index),
        // A 1px gap between slices reads as separation without a stroke.
        dashArray: `${Math.max(0, length - 1)} ${circumference - Math.max(0, length - 1)}`,
        dashOffset: -consumed,
      };

      consumed += length;
      return slice;
    });
  });

  protected readonly summary = computed(() => {
    const total = this.total();
    return (
      `${this.ariaLabel}. ` +
      this._data()
        .map((d) => `${d.label}: ${formatValue(d.value)} (${total ? Math.round((d.value / total) * 100) : 0}%)`)
        .join(', ')
    );
  });
}
