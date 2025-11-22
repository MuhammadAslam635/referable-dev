import Stripe from 'stripe';
import { db } from './db';
import { businesses } from '@shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// if (!process.env.STRIPE_SECRET_KEY ||  'strip_wertyui') {
//   throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
// }

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'strip_wertyui', {
  apiVersion: '2025-09-30.clover',
});

export const getStripeCustomerId = async (businessId: number) => {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));

  if (business?.stripeCustomerId) {
    return business.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: business.email,
    name: business.name,
    metadata: {
      businessId: business.id,
    },
  });

  await db.update(businesses).set({ stripeCustomerId: customer.id }).where(eq(businesses.id, businessId));

  return customer.id;
};

export const createCheckoutSession = async (businessId: number, priceId: string) => {
  try {
    console.log('CLIENT_URL:', process.env.CLIENT_URL);
    const customerId = await getStripeCustomerId(businessId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      metadata: {
        businessId: String(businessId),
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const handleWebhook = async (req: any) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`Error verifying webhook signature: ${err.message}`);
    return { status: 400, message: `Webhook Error: ${err.message}` };
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.businessId;

      if (!businessId) {
        return { status: 400, message: 'Webhook Error: Missing businessId in metadata' };
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const plan = subscription.items.data[0].price.id;

      await db.update(businesses).set({
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
      }).where(eq(businesses.id, parseInt(businessId)));
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const businessId = customer.metadata.businessId;

      if (!businessId) {
        return { status: 400, message: 'Webhook Error: Missing businessId in customer metadata' };
      }

      const plan = subscription.items.data[0].price.id;
      const status = subscription.status;

      await db.update(businesses).set({
        subscriptionPlan: plan,
        subscriptionStatus: status,
      }).where(eq(businesses.id, parseInt(businessId)));
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const businessId = customer.metadata.businessId;

      if (!businessId) {
        return { status: 400, message: 'Webhook Error: Missing businessId in customer metadata' };
      }

      await db.update(businesses).set({
        subscriptionStatus: 'canceled',
        subscriptionPlan: null
      }).where(eq(businesses.id, parseInt(businessId)));
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return { status: 200, message: 'Webhook handled' };
};

export const createPortalSession = async (customerId: string) => {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.CLIENT_URL}/settings`,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
  });

  return portalSession;
};
