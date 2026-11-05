import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AnalyticsChart } from '../../../shared/charts/analytics-chart';
import { Icon } from '../../../shared/components/icon/icon';

interface Settings { connectionStatus: string; selectedModel: string; hasKey: boolean; monthlyBudget: number | null; hardLimitEnabled: boolean; accessDisabled: boolean; phpPerUsd: number; }
interface Model { id: string; description: string; inputPerMillion: number | null; outputPerMillion: number | null; }
interface UsageRow { id: string; createdAtUtc: string; model: string; purpose: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number | null; status: string; errorCode: string | null; }
interface Bucket { date: string; requests: number; estimatedCost: number; tokens: number; }
interface Usage { inputTokens: number; outputTokens: number; totalTokens: number; estimatedSpending: number; monthlySpending: number; reservedSpending: number; monthlyBudget: number | null; budgetPercent: number | null; remainingConfiguredBudget: number | null; warning: string | null; sentimentRequests: number; unknownCostRequests: number; daily: Bucket[]; monthly: Bucket[]; history: UsageRow[]; models: { model: string; requests: number; estimatedCost: number; tokens: number }[]; }

@Component({
  selector: 'app-ai-settings', imports: [FormsModule, CurrencyPipe, DatePipe, DecimalPipe, AnalyticsChart, Icon],
  templateUrl: './ai-settings.html', styleUrl: './ai-settings.css',
})
export class AiSettings {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/ai-settings`;
  protected readonly settings = signal<Settings | null>(null);
  protected readonly models = signal<Model[]>([]);
  protected readonly usage = signal<Usage | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly range = signal<'daily' | 'weekly' | 'monthly'>('daily');
  protected readonly visibleUsage = this.usage;
  protected readonly exchangeRate = computed(() => this.settings()?.phpPerUsd ?? 60);
  protected php(usd: number): number { return usd * this.exchangeRate(); }
  protected apiKey = '';
  protected model = '';
  protected budget: number | null = null;
  protected hardLimit = false;
  protected readonly chart = computed<ChartConfiguration>(() => {
    const usage = this.visibleUsage();
    const rows = this.range() === 'monthly' ? usage?.monthly ?? [] : usage?.daily ?? [];
    const groups = new Map<string, number>();
    for (const row of rows) {
      const d = new Date(`${row.date}${row.date.length === 7 ? '-01' : ''}T00:00:00Z`);
      if (this.range() === 'weekly') d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
      const label = this.range() === 'monthly' ? row.date : d.toISOString().slice(0, 10);
      groups.set(label, (groups.get(label) ?? 0) + this.php(row.estimatedCost));
    }
    return { type: 'bar', data: { labels: [...groups.keys()], datasets: [{ label: 'Estimated spending (PHP)', data: [...groups.values()], backgroundColor: '#7e22ce', borderRadius: 5, maxBarThickness: 42 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: value => `₱${value}` } } } } };
  });
  constructor() { this.load(); }
  protected load(): void {
    this.busy.set(true); this.error.set('');
    forkJoin({ settings: this.http.get<Settings>(this.url), usage: this.http.get<Usage>(`${this.url}/usage`) }).subscribe({
      next: data => {
        this.settings.set(data.settings); this.usage.set(data.usage);
        this.model = data.settings.selectedModel;
        this.budget = data.settings.monthlyBudget === null ? null : Number(this.php(data.settings.monthlyBudget).toFixed(2));
        this.hardLimit = data.settings.hardLimitEnabled;
        this.busy.set(false); if (data.settings.hasKey) this.loadModels();
      }, error: e => this.fail(e),
    });
  }
  protected loadModels(): void {
    this.http.get<Model[]>(`${this.url}/models`).subscribe({ next: models => this.models.set(models), error: e => this.fail(e) });
  }
  protected connect(): void {
    if (!this.apiKey.trim() || this.busy()) return;
    const key = this.apiKey.trim(); this.apiKey = '';
    this.run(this.http.post(`${this.url}/connect`, { apiKey: key }), 'OpenAI connection verified and encrypted.');
  }
  protected test(): void { this.run(this.http.post(`${this.url}/test`, {}), 'Test completed. Token usage is included in your history.'); }
  protected rotateSecurityKey(): void {
    this.run(this.http.post(`${this.url}/security-key/rotate`, {}), 'Security key rotated. Your saved API credential has been re-encrypted and the connection remains available.');
  }
  protected disconnect(): void {
    if (confirm('Disconnect your OpenAI API key?')) { this.models.set([]); this.run(this.http.delete(`${this.url}/connection`), 'OpenAI disconnected. Usage history is retained.'); }
  }
  protected saveModel(): void { this.run(this.http.put(`${this.url}/model`, { model: this.model }), 'Model tested and saved.'); }
  protected saveBudget(): void { this.run(this.http.put(`${this.url}/budget`, { monthlyBudget: this.budget === null ? null : this.budget / this.exchangeRate(), hardLimitEnabled: this.hardLimit }), 'Monthly budget saved.'); }
  private run(request: Observable<unknown>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    request.subscribe({ next: () => { this.message.set(message); this.load(); }, error: e => this.fail(e) });
  }
  private fail(e: HttpErrorResponse): void { this.busy.set(false); this.error.set(e.error?.detail ?? e.error?.Detail ?? 'Could not update AI settings. Please try again.'); }
}
