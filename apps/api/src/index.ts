import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscriptions';
import billingRoutes from './routes/billing';
import { startCron } from './cron';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
  credentials: true,
}));
app.use(cookieParser());

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/billing', billingRoutes);

startCron();

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
