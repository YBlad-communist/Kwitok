import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getTokens() {
  const accessToken = await SecureStore.getItemAsync('accessToken');
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  return { accessToken, refreshToken };
}

async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { accessToken } = await getTokens();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
    ...options,
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const { accessToken: newToken } = await getTokens();
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${BASE}${path}`, {
        headers: { ...headers, ...(options?.headers as Record<string, string>) },
        ...options,
      });
      const retryData = await retryRes.json();
      if (!retryRes.ok) throw new Error(retryData.error || 'Request failed');
      return retryData;
    }
    throw new Error('Not authenticated');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const { refreshToken } = await getTokens();
    if (!refreshToken) return false;

    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return false;
    }

    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    await clearTokens();
    return false;
  }
}

interface User {
  id: string;
  email: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  timezone?: string;
  currency?: string;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User }>('/auth/me'),
  },
  banking: {
    institutions: (country: string) =>
      request<{ institutions: any[] }>(`/banking/institutions?country=${country}`),
    connect: (institutionId: string, institutionName: string) =>
      request<{ connection: any; link: string }>('/banking/connect', {
        method: 'POST',
        body: JSON.stringify({ institutionId, institutionName }),
      }),
    callback: (ref: string) => request<{ status: string }>(`/banking/callback?ref=${ref}`),
    connections: () => request<{ connections: any[] }>('/banking/connections'),
    deleteConnection: (id: string) =>
      request<{ message: string }>(`/banking/connections/${id}`, { method: 'DELETE' }),
    sync: (accountId: string) =>
      request<{ imported: number; total: number }>(`/banking/sync/${accountId}`, { method: 'POST' }),
  },
  accounts: () => request<{ accounts: any[] }>('/accounts'),
  transactions: {
    list: (params?: { from?: string; to?: string; categoryId?: string; accountId?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.categoryId) qs.set('categoryId', params.categoryId);
      if (params?.accountId) qs.set('accountId', params.accountId);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const q = qs.toString();
      return request<{ transactions: any[]; total: number }>(`/transactions${q ? `?${q}` : ''}`);
    },
    recategorize: (id: string, categoryId: string) =>
      request<{ transaction: any }>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      }),
  },
  categories: {
    list: () => request<{ categories: any[] }>('/categories'),
    create: (data: { name: string; icon?: string; color?: string }) =>
      request<{ category: any }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  },
  budgets: {
    list: () => request<{ budgets: any[] }>('/budgets'),
    create: (data: { categoryId: string; limitAmount: number; period: string; alertAt80?: boolean }) =>
      request<{ budget: any }>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<{ budget: any }>(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/budgets/${id}`, { method: 'DELETE' }),
    summary: () => request<{ summaries: any[] }>('/budgets/summary'),
  },
  notifications: {
    registerToken: (pushToken: string) =>
      request<{ message: string }>('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      }),
  },
  billing: {
    offerings: () => request<{ offerings: any[] }>('/billing/offerings'),
  },
  settings: {
    get: () => request<{ user: any }>('/settings'),
    update: (data: any) => request<{ user: any }>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAccount: (password: string) =>
      request<{ message: string }>('/settings/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
    export: () => {
      return `${BASE}/settings/export`;
    },
  },
};

export { saveTokens, clearTokens };
