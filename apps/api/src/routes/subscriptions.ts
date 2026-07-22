import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const FREE_LIMIT = 5;

function isPro(status: string | null, trialEndsAt: Date | null): boolean {
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'trialing' && trialEndsAt && trialEndsAt > new Date()) return true;
  return false;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: req.userId, cancelledAt: null },
      orderBy: { nextDate: 'asc' },
    });
    res.json({ subscriptions: subs });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { subscriptions: { where: { cancelledAt: null } } },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pro = isPro(user.subscriptionStatus, user.trialEndsAt);

    if (!pro && user.subscriptions.length >= FREE_LIMIT) {
      return res.status(403).json({
        error: `Free plan limit reached (max ${FREE_LIMIT} active subscriptions). Upgrade to Pro to add more.`,
      });
    }

    const { name, price, currency, cycle, nextDate, category } = req.body;

    if (!name || price === undefined || !cycle || !nextDate || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sub = await prisma.subscription.create({
      data: {
        userId: req.userId!,
        name,
        price,
        currency: currency || 'EUR',
        cycle,
        nextDate: new Date(nextDate),
        category,
      },
    });

    res.status(201).json({ subscription: sub });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sub = await prisma.subscription.findFirst({
      where: { id, userId: req.userId },
    });

    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { name, price, currency, cycle, nextDate, category, unused } = req.body;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(currency !== undefined && { currency }),
        ...(cycle !== undefined && { cycle }),
        ...(nextDate !== undefined && { nextDate: new Date(nextDate) }),
        ...(category !== undefined && { category }),
        ...(unused !== undefined && { unused }),
      },
    });

    res.json({ subscription: updated });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sub = await prisma.subscription.findFirst({
      where: { id, userId: req.userId },
    });

    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await prisma.subscription.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });

    res.json({ message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
