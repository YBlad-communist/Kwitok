import crypto from 'crypto';

const BASE = 'https://enablebanking.com';

function getPrivateKey(): string {
  const key = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!key) throw new Error('ENABLE_BANKING_PRIVATE_KEY not set');
  return key.replace(/\\n/g, '\n');
}

function getAppId(): string {
  const id = process.env.ENABLE_BANKING_APP_ID;
  if (!id) throw new Error('ENABLE_BANKING_APP_ID not set');
  return id;
}

function signJWT(): string {
  const appId = getAppId();
  const privateKey = getPrivateKey();

  const header = { alg: 'RS256', kid: appId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: appId,
    aud: 'enablebanking.com',
    iat: now,
    exp: now + 300,
  };

  const b64 = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(`${b64(header)}.${b64(payload)}`),
    privateKey,
  );

  return `${b64(header)}.${b64(payload)}.${signature.toString('base64url')}`;
}

async function api(path: string, options?: RequestInit) {
  const token = signJWT();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Enable Banking API error ${res.status}: ${text}`);
  }
  return res.json();
}

interface ASPSP {
  name: string;
  country: string;
  logo_url?: string;
  id?: string;
}

export async function getASPSPs(country: string): Promise<ASPSP[]> {
  const data = await api(`/api/aspsps?country=${country}`) as any;
  return data.aspsps || [];
}

export async function startAuth(aspspId: string, redirectUrl: string) {
  const data = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: {
        valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      aspsp: { id: aspspId },
      redirect_url: redirectUrl,
      psu_type: 'personal',
      state: crypto.randomUUID(),
    }),
  }) as any;
  return { url: data.url, sessionId: data.session_id };
}

export async function getSessionToken(sessionId: string, code: string) {
  const data = await api(`/api/auth/${sessionId}/token`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }) as any;
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function getAccounts(token: string) {
  const data = await api('/api/accounts', {
    headers: { 'Authorization': `Bearer ${token}` },
  }) as any;
  return data.accounts || [];
}

export async function getTransactions(accountId: string, token: string, dateFrom?: string) {
  let path = `/api/accounts/${accountId}/transactions`;
  if (dateFrom) path += `?date_from=${dateFrom}`;
  const data = await api(path, {
    headers: { 'Authorization': `Bearer ${token}` },
  }) as any;
  return data.transactions || [];
}
