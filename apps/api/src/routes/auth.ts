import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subscriptionStatus: 'trialing',
      },
    });

    await seedDefaultCategories(user.id);

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newAccessToken = signAccessToken({ userId: user.id });
    const newRefreshToken = signRefreshToken({ userId: user.id });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (_req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, subscriptionStatus: true, trialEndsAt: true, createdAt: true, timezone: true, currency: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: 'Продукты', icon: 'shopping-cart', color: '#22c55e' },
    { name: 'Транспорт', icon: 'car', color: '#3b82f6' },
    { name: 'Подписки', icon: 'repeat', color: '#a855f7' },
    { name: 'Рестораны', icon: 'utensils', color: '#f97316' },
    { name: 'ЖКХ', icon: 'home', color: '#06b6d4' },
    { name: 'Здоровье', icon: 'heart', color: '#ef4444' },
    { name: 'Развлечения', icon: 'gamepad-2', color: '#ec4899' },
    { name: 'Прочее', icon: 'more-horizontal', color: '#6b7280' },
  ];
  for (const cat of defaults) {
    await prisma.category.upsert({
      where: { id: `sys-${cat.name}` },
      update: {},
      create: { id: `sys-${cat.name}`, name: cat.name, icon: cat.icon, color: cat.color, isSystem: true },
    });
  }
}

export default router;
