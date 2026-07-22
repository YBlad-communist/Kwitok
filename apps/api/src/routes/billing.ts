import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2025-02-24' as any });
}

router.get('/checkout-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';
    const priceId = period === 'yearly'
      ? process.env.STRIPE_PRICE_ID_YEARLY
      : process.env.STRIPE_PRICE_ID_MONTHLY;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${process.env.FRONTEND_URL}?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}?checkout=cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.get('/portal-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

const handleWebhook = async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'] as string;

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
              trialEndsAt: null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;
        const dbStatus = status === 'active' || status === 'trialing' ? status
          : status === 'past_due' ? 'past_due'
          : 'canceled';

        if (subscription.id) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { subscriptionStatus: dbStatus },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.id) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { subscriptionStatus: null, stripeSubscriptionId: null },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: 'past_due' },
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

router.post('/webhook', (req: Request, res: Response) => {
  handleWebhook(req, res);
});

export default router;
