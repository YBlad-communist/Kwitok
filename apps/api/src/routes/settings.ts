import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true, timezone: true, currency: true, pushToken: true, subscriptionStatus: true, trialEndsAt: true },
  });
  res.json({ user });
});

router.patch('/', async (req: AuthRequest, res: Response) => {
  const allowed = ['timezone', 'currency'];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const user = await prisma.user.update({ where: { id: req.userId }, data: updates, select: { email: true, timezone: true, currency: true } });
  res.json({ user });
});

router.delete('/account', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      include: { account: { select: { name: true } }, category: true },
      orderBy: { date: 'desc' },
    });

    const csv = [
      'Date,Merchant,Description,Amount,Currency,Category,Account',
      ...transactions.map((tx) =>
        [tx.date.toISOString().split('T')[0], tx.merchantName || '', `"${(tx.description || '').replace(/"/g, '""')}"`, tx.amount, tx.currency, tx.category?.name || '', tx.account.name].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=kwitok-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
