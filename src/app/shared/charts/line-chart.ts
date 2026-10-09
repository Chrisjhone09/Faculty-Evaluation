import { Component, Input, computed, signal } from '@angular/core';
import { TrendPoint, formatValue } from './chart-models';

/**
 * Line chart for trends over time - submissions per day, rating movement
 * across periods. Only reach for this when the x-axis is genuinely ordered;
 * for unordered category comparisons use a bar chart instead.
 *
 * Plain SVG on a 0-100 viewBox with preserveAspectRatio="none" on the fill
 * so it stretches to any container width while the stroke stays crisp via
 * vector-effect.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (points().length < 2) {
      <p class="empty-state">Not enough data points to show a trend yet.</p>
    } @else {
      <figure class="line-figure">
        <svg
          class="line-svg"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          role="img"
          [attr.aria-label]="summary()"
        >
          <!-- Horizontal gridlines at 0 / 50 / 100% of the scale. -->
          @for (line of gridLines; track line) {
            <line x1="0" [attr.y1]="line" x2="100" [attr.y2]="line" stroke="var(--color-chart-grid)" stroke-width="0.25" />
          }

          <path [attr.d]="areaPath()" [attr.fill]="areaFill" />
          <path
            [attr.d]="linePath()"
            fill="none"
            stroke="var(--color-chart-1)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- Markers sit outside the stretched SVG so they stay circular. -->
        <div class="line-markers">
          @for (point of points(); track point.label) {
            <span
              class="line-marker"
              [style.left.%]="point.x"
              [style.bottom.%]="point.markerBottom"
              [attr.data-tooltip]="point.label + ': ' + point.display"
              tabindex="0"
              role="note"
            ></span>
          }
        </div>

        <figcaption class="line-axis">
          <span>{{ points()[0].label }}</span>
          @if (points().length > 2) {
            <span class="line-axis-peak">Peak {{ peak() }}</span>
          }
          <span>{{ points()[points().length - 1].label }}</span>
        </figcaption>
      </figure>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .line-figure { margin: 0; position: relative; }
      .line-svg { width: 100%; height: 120px; display: block; overflow: visible; }
      .line-markers { position: absolute; inset: 0 0 22px 0; pointer-events: none; }
      .line-marker {
        position: absolute;
        width: 8px;
        height: 8px;
        margin: 0 0 -4px -4px;
        border-radius: 50%;
        background: var(--color-surface);
        border: 2px solid var(--color-chart-1);
        pointer-events: auto;
      }
      .line-marker:focus-visible { outline: none; box-shadow: var(--focus-ring); }
      .line-axis {
        display: flex;
        justify-content: space-between;
        gap: var(--space-2);
        margin-top: var(--space-2);
        font-size: var(--text-xs);
        color: var(--color-text-muted);
      }
      .line-axis-peak { color: var(--color-text-subtle); }
    `,
  ],
})
export class LineChart {
  @Input({ required: true }) set data(value: TrendPoint[]) {
    this._data.set(value ?? []);
  }
  @Input() valueSuffix = '';
  @Input() ariaLabel = 'Trend over time';
  /** Force the y-axis to start at zero. Off by default so small movements stay visible. */
  @Input() zeroBased = false;

  protected readonly areaFill = 'rgba(124, 58, 237, 0.09)';
  protected readonly gridLines = [0, 20, 40];

  protected readonly _data = signal<TrendPoint[]>([]);

  private readonly bounds = computed(() => {
    const values = this._data().map((d) => d.value);
    if (values.length === 0) {
      return { min: 0, max: 1 };
    }
    const rawMin = this.zeroBased ? 0 : Math.min(...values);
    const rawMax = Math.max(...values);
    // Pad a flat series so it renders as a centred line rather than an edge.
    if (rawMin === rawMax) {
      return { min: rawMin - 1, max: rawMax + 1 };
    }
    const padding = (rawMax - rawMin) * 0.12;
    return { min: rawMin - padding, max: rawMax + padding };
  });

  protected readonly points = computed(() => {
    const data = this._data();
    const { min, max } = this.bounds();
    const span = max - min || 1;

    return data.map((d, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
      const ratio = (d.value - min) / span;
      return {
        label: d.label,
        display: `${formatValue(d.value)}${this.valueSuffix}`,
        x,
        // SVG y grows downward; the marker layer is positioned from the bottom.
        y: 40 - ratio * 40,
        markerBottom: ratio * 100,
      };
    });
  });

  protected readonly linePath = computed(() =>
    this.points()
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const points = this.points();
    if (points.length < 2) {
      return '';
    }
    return `${this.linePath()} L${points[points.length - 1].x.toFixed(2)},40 L${points[0].x.toFixed(2)},40 Z`;
  });

  protected readonly peak = computed(() => {
    const data = this._data();
    if (data.length === 0) {
      return '';
    }
    const top = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
    return `${formatValue(top.value)}${this.valueSuffix}`;
  });

  protected readonly summary = computed(
    () =>
      `${this.ariaLabel}. ` +
      this._data()
        .map((d) => `${d.label}: ${formatValue(d.value)}${this.valueSuffix}`)
        .join(', '),
  );
}
