import cron from 'node-cron';
import prisma from './lib/prisma';
import * as eb from './lib/enablebanking';
import { categorizeTransaction } from './lib/categorizer';

export function startCron() {
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Cron] Starting transaction sync...');
    await syncAllAccounts();
    console.log('[Cron] Transaction sync complete');
  });
}

export async function syncAllAccounts() {
  const accounts = await prisma.account.findMany({
    where: { bankConnection: { status: 'linked' } },
    include: { bankConnection: true, user: true },
  });

  for (const account of accounts) {
    try {
      const accessToken = account.bankConnection.requisitionId;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
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
        const categoryId = await categorizeTransaction(merchantName, description, account.userId);

        await prisma.transaction.create({
          data: {
            userId: account.userId,
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

      if (imported > 0) {
        await checkBudgetAlerts(account.userId);
      }

      console.log(`[Cron] Synced ${imported}/${transactions.length} transactions for account ${account.id}`);
    } catch (error) {
      console.error(`[Cron] Error syncing account ${account.id}:`, error);
    }
  }
}

async function checkBudgetAlerts(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
  });

  const now = new Date();

  for (const budget of budgets) {
    let periodStart: Date;
    if (budget.period === 'weekly') {
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - periodStart.getDay());
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const agg = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        date: { gte: periodStart, lte: now },
      },
      _sum: { amount: true },
    });

    const spent = Math.abs(Number(agg._sum.amount || 0));
    const limit = Number(budget.limitAmount);
    if (limit <= 0) continue;

    const percentage = (spent / limit) * 100;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pushToken) continue;

    try {
      if (percentage >= 100 && percentage < 120) {
        const excess = (spent - limit).toFixed(2);
        await sendPushNotification(user.pushToken, `Лимит на "${budget.category.name}" превышен на €${excess}`);
      } else if (budget.alertAt80 && percentage >= 80 && percentage < 100) {
        await sendPushNotification(user.pushToken, `Ты потратил ${Math.round(percentage)}% лимита на "${budget.category.name}"`);
      }
    } catch (error) {
      console.error(`[Cron] Error sending alert for budget ${budget.id}:`, error);
    }
  }
}

async function sendPushNotification(pushToken: string, body: string) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ to: pushToken, sound: 'default', body, title: 'Квиток' }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[Push] Send error:', err);
  }
}
