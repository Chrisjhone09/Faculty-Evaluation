import { Injectable } from '@angular/core';
import { CurrentUser } from '../models/auth.models';

const REFRESH_TOKEN_KEY = 'fe.refreshToken';
const USER_KEY = 'fe.currentUser';

/**
 * Wraps localStorage access for the two pieces of auth state that need to
 * survive a full page reload: the refresh token and the last-known current
 * user (used to render the UI instantly while a silent refresh is in
 * flight). The short-lived access token is deliberately NOT persisted here -
 * AuthService keeps it in memory only and re-derives it via refresh() on
 * app startup, so a stolen localStorage dump is only ever as powerful as a
 * refresh token (which is itself hashed server-side and revocable).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  getStoredUser(): CurrentUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }

  setStoredUser(user: CurrentUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
