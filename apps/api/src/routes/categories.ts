import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: req.userId }, { isSystem: true }] },
    orderBy: { name: 'asc' },
  });
  res.json({ categories });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const category = await prisma.category.create({
      data: { userId: req.userId, name, icon: icon || 'folder', color: color || '#6b7280' },
    });
    res.status(201).json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
