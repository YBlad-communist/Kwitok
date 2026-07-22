import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as eb from '../lib/enablebanking';
import { categorizeTransaction } from '../lib/categorizer';

const router = Router();
router.use(authMiddleware);

router.get('/institutions', async (req: AuthRequest, res: Response) => {
  try {
    const country = (req.query.country as string) || 'LV';
    const institutions = await eb.getASPSPs(country);
    res.json({ institutions });
  } catch (error) {
    console.error('Fetch institutions error:', error);
    res.status(502).json({ error: 'Failed to fetch institutions' });
  }
});

router.post('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { institutionId, institutionName } = req.body;
    if (!institutionId) return res.status(400).json({ error: 'institutionId required' });

    const callbackUrl = `https://kwitok.onrender.com/api/banking/callback`;
    const { url, sessionId } = await eb.startAuth(institutionId, callbackUrl);

    const connection = await prisma.bankConnection.create({
      data: {
        userId: req.userId!,
        provider: 'enablebanking',
        institutionId,
        institutionName: institutionName || institutionId,
        requisitionId: sessionId,
        status: 'pending',
      },
    });

    res.json({ connection, link: url });
  } catch (error) {
    console.error('Connect bank error:', error);
    res.status(502).json({ error: 'Failed to initiate bank connection' });
  }
});

router.get('/callback', async (req: AuthRequest, res: Response) => {
  const sessionId = req.query.session_id as string;
  const code = req.query.code as string;

  if (!sessionId || !code) {
    return res.redirect(`kwitok://callback?error=missing_params`);
  }

  try {
    const connection = await prisma.bankConnection.findFirst({
      where: { requisitionId: sessionId },
    });
    if (!connection) {
      return res.redirect(`kwitok://callback?error=connection_not_found`);
    }

    const { accessToken, refreshToken: tokenRefresh } = await eb.getSessionToken(sessionId, code);

    const accounts = await eb.getAccounts(accessToken);

    await prisma.$transaction(async (tx) => {
      await tx.bankConnection.update({
        where: { id: connection.id },
        data: {
          status: 'linked',
          requisitionId: accessToken,
        },
      });

      for (const acc of accounts) {
        const existingAccount = await tx.account.findFirst({
          where: { externalAccountId: acc.id, userId: connection.userId },
        });

        if (!existingAccount) {
          await tx.account.create({
            data: {
              userId: connection.userId,
              bankConnectionId: connection.id,
              externalAccountId: acc.id,
              name: acc.name || acc.product || 'Account',
              iban: acc.iban || null,
              balance: acc.balance ? Number(acc.balance) : null,
              currency: acc.currency || 'EUR',
            },
          });
        }
      }
    });

    res.redirect(`kwitok://callback?status=linked`);
  } catch (error) {
    console.error('Bank callback error:', error);
    res.redirect(`kwitok://callback?error=callback_failed`);
  }
});

router.get('/connections', async (req: AuthRequest, res: Response) => {
  const connections = await prisma.bankConnection.findMany({
    where: { userId: req.userId },
    include: { accounts: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ connections });
});

router.delete('/connections/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const connection = await prisma.bankConnection.findFirst({
      where: { id, userId: req.userId },
    });
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    await prisma.bankConnection.delete({ where: { id } });
    res.json({ message: 'Connection removed' });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync/:accountId', async (req: AuthRequest, res: Response) => {
  try {
    const accountId = req.params.accountId as string;
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: req.userId },
      include: { bankConnection: true },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if ((account as any).bankConnection.status !== 'linked') {
      return res.status(400).json({ error: 'Bank connection not linked' });
    }

    const accessToken = account.bankConnection.requisitionId;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 90);
    const transactions = await eb.getTransactions(
      account.externalAccountId,
      accessToken,
      dateFrom.toISOString().split('T')[0],
    );

    let imported = 0;
    for (const tx of transactions) {
      const externalId = tx.id || tx.transactionId || `${tx.booking_date}-${Math.abs(tx.amount || 0)}-${tx.merchant_name || ''}`;
      const existing = await prisma.transaction.findUnique({
        where: { externalTransactionId: String(externalId) },
      });
      if (existing) continue;

      const amount = Number(tx.amount || 0);
      const merchantName = tx.merchant_name || tx.debtor_name || tx.creditor_name || null;
      const description = tx.remittance_information || tx.description || null;
      const categoryId = await categorizeTransaction(merchantName, description, req.userId!);

      await prisma.transaction.create({
        data: {
          userId: req.userId!,
          accountId: account.id,
          externalTransactionId: String(externalId),
          amount: amount < 0 ? amount : -amount,
          currency: tx.currency || 'EUR',
          merchantName,
          description,
          date: new Date(tx.booking_date || tx.value_date),
          categoryId,
        },
      });
      imported++;
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });

    res.json({ imported, total: transactions.length });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

export default router;
