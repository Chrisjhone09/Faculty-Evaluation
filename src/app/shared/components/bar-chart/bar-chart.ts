import { Component, Input, computed, signal } from '@angular/core';
import { ChartDatum } from '../../charts/chart-models';

/**
 * Alias kept so existing call sites keep compiling. New code should import
 * `ChartDatum` from shared/charts/chart-models, which every chart shares.
 */
export type BarChartDatum = ChartDatum;

/**
 * Small dependency-free SVG bar chart (no charting library in this project -
 * see README "Guidance role" notes). Renders vertical bars scaled to `max`
 * (defaults to the largest value in `data`, so pass an explicit `max` when
 * comparing against a fixed scale like a 1-5 or 6-10 rating).
 */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
})
export class BarChart {
  @Input({ required: true }) set data(value: BarChartDatum[]) {
    this._data.set(value ?? []);
  }
  @Input() max: number | null = null;
  @Input() valueSuffix = '';
  /**
   * Bar fill colour. Defaults to the shared primary chart token so every
   * chart in the app is on-brand without callers having to know the hex.
   * Pass another `--color-chart-*` token (see styles.css) when a page shows
   * two charts side by side and they need to stay visually distinct.
   */
  @Input() barColor = 'var(--color-chart-1)';

  protected readonly _data = signal<BarChartDatum[]>([]);

  protected readonly effectiveMax = computed(() => {
    if (this.max !== null && this.max > 0) {
      return this.max;
    }
    const values = this._data().map((d) => d.value);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  });

  protected readonly bars = computed(() =>
    this._data().map((d) => ({
      ...d,
      heightPercent: Math.max(0, Math.min(100, (d.value / this.effectiveMax()) * 100)),
    })),
  );
}
