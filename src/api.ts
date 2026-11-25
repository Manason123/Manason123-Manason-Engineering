import type { SafeUser } from '../server/types.ts';
import type { WorkspacePayload } from './types.ts';

const TOKEN_KEY = 'buildtrack_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: SafeUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestAccess: (payload: { name: string; email: string; requestedRole: string; note: string }) =>
    request('/api/auth/request-access', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWorkspace: () => request<WorkspacePayload>('/api/workspace'),

  createProject: (payload: Record<string, unknown>) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),

  addBoqItem: (payload: Record<string, unknown>) =>
    request('/api/boq', { method: 'POST', body: JSON.stringify(payload) }),

  freezeBaseline: (projectId: string) =>
    request(`/api/projects/${projectId}/freeze-baseline`, { method: 'POST' }),

  createVariation: (payload: Record<string, unknown>) =>
    request('/api/variations', { method: 'POST', body: JSON.stringify(payload) }),

  decideVariation: (id: string, decision: 'approved' | 'rejected') =>
    request(`/api/variations/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  createReport: (payload: Record<string, unknown>) =>
    request('/api/reports', { method: 'POST', body: JSON.stringify(payload) }),

  decideReport: (id: string, decision: 'approved' | 'rejected', reviewNote: string) =>
    request(`/api/reports/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewNote }),
    }),

  createMaterialOrder: (payload: Record<string, unknown>) =>
    request('/api/materials/orders', { method: 'POST', body: JSON.stringify(payload) }),

  advanceMaterialOrder: (id: string) =>
    request(`/api/materials/orders/${id}/advance`, { method: 'POST' }),

  createLedgerEntry: (payload: Record<string, unknown>) =>
    request('/api/ledger', { method: 'POST', body: JSON.stringify(payload) }),

  approveLedgerEntry: (id: string) =>
    request(`/api/ledger/${id}/approve`, { method: 'POST' }),

  reverseLedgerEntry: (id: string) =>
    request(`/api/ledger/${id}/reverse`, { method: 'POST' }),

  createUser: (payload: Record<string, unknown>) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),

  decideAccessRequest: (id: string, decision: 'approved' | 'rejected', role?: string) =>
    request(`/api/access-requests/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, role }),
    }),
};

export function formatMoney(amount: number, currency = 'RWF'): string {
  return `${Math.round(amount).toLocaleString('en-US')} ${currency}`;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
