import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.post('/register-token', async (req: AuthRequest, res: Response) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'pushToken required' });

    await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken },
    });
    res.json({ message: 'Push token registered' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
