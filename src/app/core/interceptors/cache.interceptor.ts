import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { finalize, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

/** Session-only, bounded cache. Never persisted to browser storage. */
@Injectable({ providedIn: 'root' })
export class ApiCache {
  private readonly entries = new Map<string, { response: HttpResponse<unknown>; expires: number }>();
  private revision = 0;
  get generation(): number { return this.revision; }
  clear(): void { this.entries.clear(); this.revision++; }
  get(key: string): HttpResponse<unknown> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expires <= Date.now()) { this.entries.delete(key); return null; }
    return entry.response.clone({ body: structuredClone(entry.response.body) });
  }
  put(key: string, response: HttpResponse<unknown>, ttl: number, generation: number): void {
    // An earlier GET must not repopulate the cache after an edit or logout.
    if (generation !== this.revision) return;
    if (this.entries.size >= 50) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { response: response.clone({ body: structuredClone(response.body) }), expires: Date.now() + ttl });
  }
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_BASE_URL}/`)) return next(req);
  const cache = inject(ApiCache);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    cache.clear();
    // Also invalidate reads made while the write was in flight, including failed writes.
    return next(req).pipe(finalize(() => cache.clear()));
  }
  const path = req.url.slice(API_BASE_URL.length).split('?')[0];
  const ttl = path === '/guidance/analytics' ? 15_000
    : /^\/(departments|subjects|sections|evaluation-periods|evaluation-forms)(\/[^/]+)?$/.test(path) ? 60_000 : 0;
  const authorization = req.headers.get('Authorization');
  if (req.method !== 'GET' || req.responseType !== 'json' || !ttl || !authorization) return next(req);
  const key = `${authorization}:${req.urlWithParams}`;
  const cached = cache.get(key);
  if (cached) return of(cached);
  const generation = cache.generation;
  return next(req).pipe(tap(event => {
    if (event instanceof HttpResponse && event.status === 200) cache.put(key, event, ttl, generation);
  }));
};
