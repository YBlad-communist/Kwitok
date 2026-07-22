const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ user: any }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      request<{ user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: any }>('/auth/me'),
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
