const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { ...headers, ...options?.headers as Record<string, string> },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

interface User {
  id: string;
  email: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User }>('/auth/me'),
  },
  subscriptions: {
    list: () => request<{ subscriptions: any[] }>('/subscriptions'),
    create: (data: any) =>
      request<{ subscription: any }>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<{ subscription: any }>(`/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ message: string }>(`/subscriptions/${id}`, { method: 'DELETE' }),
  },
  billing: {
    createCheckout: (period: string) =>
      request<{ url: string }>(`/billing/checkout-session?period=${period}`),
    createPortal: () =>
      request<{ url: string }>('/billing/portal-session'),
  },
};
