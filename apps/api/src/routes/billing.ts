import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/offerings', authMiddleware, async (_req: AuthRequest, res: Response) => {
  res.json({
    offerings: [
      { id: 'pro_monthly', name: 'Pro Monthly', price: 6.99, currency: 'EUR', period: 'monthly' },
      { id: 'pro_yearly', name: 'Pro Yearly', price: 59.99, currency: 'EUR', period: 'yearly' },
    ],
  });
});

router.post('/webhook', async (req: AuthRequest, res: Response) => {
  try {
    const event = req.body;
    if (event.type === 'initial_purchase' || event.type === 'renewal') {
      const revenueCatId = event.data?.app_user_id || event.data?.userId;
      if (revenueCatId) {
        await prisma.user.update({
          where: { revenueCatCustomerId: revenueCatId },
          data: { subscriptionStatus: 'active' },
        });
      }
    } else if (event.type === 'cancellation') {
      const revenueCatId = event.data?.app_user_id || event.data?.userId;
      if (revenueCatId) {
        await prisma.user.update({
          where: { revenueCatCustomerId: revenueCatId },
          data: { subscriptionStatus: 'canceled' },
        });
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
