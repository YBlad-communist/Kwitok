import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    include: { bankConnection: { select: { institutionName: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ accounts });
});

export default router;
