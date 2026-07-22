const BASE = 'https://bankaccountdata.gocardless.com/api/v2';

let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  const res = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });

  if (!res.ok) throw new Error('Failed to get Nordigen token');
  const data = await res.json() as any;
  accessToken = data.access;
  tokenExpiresAt = Date.now() + (data.access_expires || 86400) * 1000;
  return accessToken;
}

export async function getInstitutions(country: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/institutions/?country=${country}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch institutions');
  return res.json();
}

export async function createRequisition(institutionId: string, redirectUrl: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/requisitions/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_id: institutionId,
      redirect: redirectUrl,
      reference: Date.now().toString(),
    }),
  });
  if (!res.ok) throw new Error('Failed to create requisition');
  return res.json() as Promise<{ id: string; link: string }>;
}

export async function getRequisition(requisitionId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get requisition');
  return res.json() as Promise<{ id: string; status: string; accounts: string[] }>;
}

export async function getAccountDetails(accountId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/accounts/${accountId}/details/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get account details');
  return res.json();
}

export async function getAccountBalances(accountId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/accounts/${accountId}/balances/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get balances');
  return res.json();
}

export async function getAccountTransactions(accountId: string, dateFrom?: string, dateTo?: string) {
  const token = await getAccessToken();
  let url = `${BASE}/accounts/${accountId}/transactions/`;
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get transactions');
  return res.json();
}
