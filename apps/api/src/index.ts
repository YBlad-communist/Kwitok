import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import bankingRoutes from './routes/banking';
import accountsRoutes from './routes/accounts';
import transactionsRoutes from './routes/transactions';
import categoriesRoutes from './routes/categories';
import budgetsRoutes from './routes/budgets';
import notificationsRoutes from './routes/notifications';
import billingRoutes from './routes/billing';
import settingsRoutes from './routes/settings';
import { startCron } from './cron';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_REDIRECT_URL || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);

startCron();

app.listen(PORT, () => {
  console.log(`Kwitok API running on port ${PORT}`);
});

export default app;
