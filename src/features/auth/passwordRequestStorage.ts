const STORAGE_KEY = 'salespilot.passwordResetRequest';

export interface StoredPasswordRequest {
  email: string;
  token: string;
}

export function readStoredPasswordRequest(): StoredPasswordRequest | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPasswordRequest>;
    if (typeof parsed.email !== 'string' || typeof parsed.token !== 'string') return null;
    return { email: parsed.email, token: parsed.token };
  } catch {
    return null;
  }
}

export function saveStoredPasswordRequest(request: StoredPasswordRequest): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(request));
}

export function clearStoredPasswordRequest(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
