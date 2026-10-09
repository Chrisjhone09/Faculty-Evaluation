/** Shared shapes for every chart component. */

export interface ChartDatum {
  label: string;
  value: number;
  /** Secondary text under the label, e.g. "12 responses". */
  note?: string;
  /**
   * Override the series colour. Defaults to the purple chart ramp. Only set
   * this when a bar carries meaning that isn't brand-related, e.g. a flagged
   * instructor rendered in the warning colour.
   */
  color?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * The purple chart ramp, ordered for maximum lightness separation so
 * adjacent series stay distinguishable while staying on-brand.
 */
export const CHART_SERIES_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
] as const;

export function seriesColor(index: number): string {
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
}

/** Rounds to at most `places` decimals without trailing zeroes. */
export function formatValue(value: number, places = 2): string {
  return Number.parseFloat(value.toFixed(places)).toString();
}
