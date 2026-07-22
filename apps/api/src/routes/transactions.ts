import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { from, to, categoryId, accountId, limit, offset } = req.query;

  const where: any = { userId: req.userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from as string);
    if (to) where.date.lte = new Date(to as string);
  }
  if (categoryId) where.categoryId = categoryId as string;
  if (accountId) where.accountId = accountId as string;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: Math.min(Number(limit) || 50, 200),
      skip: Number(offset) || 0,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, total });
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { categoryId } = req.body;

    const tx = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId: categoryId || null,
        isManuallyRecategorized: true,
      },
    });

    if (categoryId && tx.merchantName) {
      const existingRule = await prisma.merchantCategoryRule.findFirst({
        where: { merchantMatch: tx.merchantName },
      });
      if (!existingRule) {
        await prisma.merchantCategoryRule.create({
          data: { merchantMatch: tx.merchantName, categoryId },
        }).catch(() => {});
      }
    }

    res.json({ transaction: updated });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
