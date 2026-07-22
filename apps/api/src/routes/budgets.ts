import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ budgets });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, limitAmount, period, alertAt80 } = req.body;
    if (!categoryId || !limitAmount || !period) {
      return res.status(400).json({ error: 'categoryId, limitAmount, period required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isPro = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';
    if (!isPro) {
      const budgetCount = await prisma.budget.count({ where: { userId: req.userId } });
      if (budgetCount >= 3) {
        return res.status(403).json({ error: 'Free plan limited to 3 budgets. Upgrade to Pro.' });
      }
    }

    const budget = await prisma.budget.create({
      data: { userId: req.userId!, categoryId, limitAmount, period, alertAt80: alertAt80 !== false },
    });
    res.status(201).json({ budget });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    const budget = await prisma.budget.update({
      where: { id },
      data: req.body,
    });
    res.json({ budget });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    await prisma.budget.delete({ where: { id } });
    res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId },
    include: { category: true },
  });

  const now = new Date();
  const summaries = await Promise.all(budgets.map(async (budget) => {
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
        userId: req.userId,
        categoryId: budget.categoryId,
        date: { gte: periodStart, lte: now },
      },
      _sum: { amount: true },
    });

    const spent = Number(agg._sum.amount || 0);
    const limit = Number(budget.limitAmount);
    return {
      id: budget.id,
      category: budget.category,
      limitAmount: budget.limitAmount,
      period: budget.period,
      spent: Math.abs(spent),
      percentage: limit > 0 ? Math.min(Math.round((Math.abs(spent) / limit) * 100), 999) : 0,
    };
  }));

  res.json({ summaries });
});

export default router;
