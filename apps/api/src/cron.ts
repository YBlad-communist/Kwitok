import cron from 'node-cron';
import prisma from './lib/prisma';

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Квиток <noreply@kwitok.app>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

async function checkUpcomingPayments() {
  const now = new Date();
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);

  const subs = await prisma.subscription.findMany({
    where: {
      cancelledAt: null,
      nextDate: { gte: now, lte: in3Days },
    },
    include: { user: true },
  });

  for (const sub of subs) {
    const daysUntil = Math.ceil((sub.nextDate.getTime() - now.getTime()) / 86400000);
    if (daysUntil >= 1 && daysUntil <= 3) {
      await sendEmail(
        sub.user.email,
        `Скоро списание — ${sub.name}`,
        `<p>Через ${daysUntil} дн. спишется <strong>${sub.name}</strong> — ${Number(sub.price)} ${sub.currency}.</p>`
      );
    }
  }
}

async function checkExpiredTrials() {
  const now = new Date();

  const expiredUsers = await prisma.user.findMany({
    where: {
      trialEndsAt: { lt: now },
      stripeSubscriptionId: null,
      subscriptionStatus: 'trialing',
    },
  });

  for (const user of expiredUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: null, trialEndsAt: null },
    });
  }

  if (expiredUsers.length > 0) {
    console.log(`Converted ${expiredUsers.length} users from trialing to free`);
  }
}

export function startCron() {
  // Run daily at 09:00 UTC
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Checking upcoming payments...');
    await checkUpcomingPayments();
    console.log('[Cron] Checking expired trials...');
    await checkExpiredTrials();
  });

  console.log('Cron jobs scheduled');
}
