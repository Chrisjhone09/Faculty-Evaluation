import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../config/api-config';
import { ApiCache, cacheInterceptor } from './cache.interceptor';

describe('API memory cache', () => {
  let http: HttpClient;
  let server: HttpTestingController;
  const url = `${API_BASE_URL}/departments`;
  const options = { headers: { Authorization: 'Bearer user-one' } };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([cacheInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); server = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { server.verify(); vi.restoreAllMocks(); });

  it('reuses reads, isolates response bodies, and expires entries', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    http.get<any[]>(url, options).subscribe(body => body.push({ id: 'local-edit' }));
    server.expectOne(url).flush([{ id: 'original' }]);
    http.get(url, options).subscribe(body => expect(body).toEqual([{ id: 'original' }]));
    server.expectNone(url);
    now.mockReturnValue(61_001);
    http.get(url, options).subscribe(); server.expectOne(url).flush([]);
  });

  it('separates sessions and query filters', () => {
    http.get(url, options).subscribe(); server.expectOne(url).flush([]);
    http.get(url, { headers: { Authorization: 'Bearer user-two' } }).subscribe(); server.expectOne(url).flush([]);
    http.get(url, { ...options, params: { active: 'true' } }).subscribe(); server.expectOne(`${url}?active=true`).flush([]);
  });

  it('invalidates after edits and ignores GETs started before invalidation', () => {
    http.get(url, options).subscribe(); const oldRead = server.expectOne(url);
    http.put(url, {}, options).subscribe(); const write = server.expectOne(url);
    oldRead.flush([{ id: 'stale' }]); write.flush({});
    http.get(url, options).subscribe(); server.expectOne(url).flush([]);
    TestBed.inject(ApiCache).clear();
    http.get(url, options).subscribe(); server.expectOne(url).flush([]);
  });

  it('never caches student eligibility, comments, auth, or failed reads', () => {
    for (const path of ['/students/me/evaluations', '/guidance/comments', '/auth/me']) {
      for (let i = 0; i < 2; i++) {
        http.get(`${API_BASE_URL}${path}`, options).subscribe(); server.expectOne(`${API_BASE_URL}${path}`).flush([]);
      }
    }
    http.get(url, options).subscribe({ error: () => {} }); server.expectOne(url).flush({}, { status: 500, statusText: 'Failed' });
    http.get(url, options).subscribe(); server.expectOne(url).flush([]);
  });

  it('expires analytics after fifteen seconds', () => {
    const analyticsUrl = `${API_BASE_URL}/guidance/analytics`;
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    http.get(analyticsUrl, options).subscribe(); server.expectOne(analyticsUrl).flush({ submitted: 1 });
    now.mockReturnValue(14_999);
    http.get(analyticsUrl, options).subscribe(); server.expectNone(analyticsUrl);
    now.mockReturnValue(15_000);
    http.get(analyticsUrl, options).subscribe(); server.expectOne(analyticsUrl).flush({ submitted: 2 });
  });
});
