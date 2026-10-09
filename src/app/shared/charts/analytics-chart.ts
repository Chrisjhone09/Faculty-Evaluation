import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import {
  Chart, ChartConfiguration, LineController, BarController, DoughnutController,
  LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';

Chart.register(LineController, BarController, DoughnutController, LineElement, PointElement,
  BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-analytics-chart',
  template: '<canvas #canvas role="img" [attr.aria-label]="label">{{ label }}</canvas>',
  styles: [':host { display: block; position: relative; width: 100%; height: 260px; min-width: 0; }'],
})
export class AnalyticsChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: ChartConfiguration;
  @Input({ required: true }) label = '';
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  ngAfterViewInit(): void { this.render(); }
  ngOnChanges(): void { this.render(); }
  ngOnDestroy(): void { this.chart?.destroy(); }

  private render(): void {
    if (!this.canvas || !this.config) return;
    this.chart?.destroy();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.chart = new Chart(this.canvas.nativeElement, {
      ...this.config,
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 350 },
        ...this.config.options,
      },
    });
  }
}
