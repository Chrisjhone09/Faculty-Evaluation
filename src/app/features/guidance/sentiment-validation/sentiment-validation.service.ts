import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api-config';

export type Sentiment = 'Positive' | 'Neutral' | 'Negative';
export interface ValidationBatch { id: string; name: string; periodName: string; total: number; labeled: number; createdAtUtc: string; completedAtUtc: string | null; }
export interface ReviewItem { id: string; commentText: string; humanSentiment: Sentiment | null; aiSentiment: Sentiment | null; method: string | null; model: string | null; promptVersion: string | null; agreement: string | null; isExcluded: boolean; }
export interface ValidationMetrics {
  total: number; classified: number; unclassified: number; coverage: number; accuracy: number | null; macroF1: number | null; excluded: number;
  classes: { sentiment: string; support: number; predicted: number; precision: number | null; recall: number | null; f1: number }[];
  confusion: { human: string; ai: string; count: number }[];
}
export interface ValidationDetail {
  id: string; name: string; periodName: string; rubric: string; completedAtUtc: string | null; items: ReviewItem[]; metrics: ValidationMetrics | null;
  cohorts: { method: string; model: string; promptVersion: string; metrics: ValidationMetrics }[];
}
@Injectable({ providedIn: 'root' })
export class SentimentValidationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/guidance/sentiment-validation`;
  list(periodId?: string) { return this.http.get<ValidationBatch[]>(this.url, { params: periodId ? { periodId } : {} }); }
  create(evaluationPeriodId: string, name: string, sampleSize: number) { return this.http.post<ValidationDetail>(this.url, { evaluationPeriodId, name, sampleSize }); }
  get(id: string) { return this.http.get<ValidationDetail>(`${this.url}/${id}`); }
  delete(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  save(id: string, labels: { itemId: string; sentiment: Sentiment | null; isExcluded: boolean }[]) { return this.http.put<ValidationDetail>(`${this.url}/${id}/labels`, labels); }
  complete(id: string) { return this.http.post<ValidationDetail>(`${this.url}/${id}/complete`, {}); }
}
