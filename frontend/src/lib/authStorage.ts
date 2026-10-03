export interface StoredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  status: string;
  avatarUrl?: string | null;
}

export interface StoredAuth {
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
}

const KEY = 'parkflow.auth';

// NOTE: localStorage is simple and works for this reference implementation, but is readable
// by any script on the page (XSS risk). A hardened production build should move the refresh
// token into an httpOnly cookie set by the backend and keep only the short-lived access
// token (or nothing) in JS-reachable storage. See docs/security-architecture.md.
export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(KEY);
}
