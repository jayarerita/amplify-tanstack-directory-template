import type { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Initialize Amplify client
const client = generateClient<Schema>();

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'create-subscription':
        return await createSubscription(event, headers);
      case 'create-ad-payment':
        return await createAdPayment(event, headers);
      case 'webhook':
        return await handleWebhook(event, headers);
      case 'cancel-subscription':
        return await cancelSubscription(event, headers);
      case 'update-subscription':
        return await updateSubscription(event, headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Stripe payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function createSubscription(event: any, headers: any) {
  const { userId, tier, priceId, paymentMethodId } = JSON.parse(event.body || '{}');

  try {
    // Create or retrieve customer
    const customer = await stripe.customers.create({
      metadata: { userId },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, tier },
    });

    // Save subscription to database
    await client.models.Subscription.create({
      userId,
      tier: tier as 'BRONZE' | 'SILVER' | 'GOLD',
      stripeSubscriptionId: subscription.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      features: getFeaturesByTier(tier),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      }),
    };
  } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}

async function createAdPayment(event: any, headers: any) {
  const { userId, adData, amount } = JSON.parse(event.body || '{}');

  try {
    // Create payment intent for ad purchase
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        type: 'ad_purchase',
        adData: JSON.stringify(adData),
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
    };
  } catch (error) {
    console.error('Ad payment creation error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}

async function handleWebhook(event: any, headers: any) {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(stripeEvent.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleSubscriptionPayment(stripeEvent.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(stripeEvent.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(stripeEvent.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ received: true }),
  };
}

async function handlePaymentSuccess(paymentIntent: any) {
  if (paymentIntent.metadata.type === 'ad_purchase') {
    const { userId, adData } = paymentIntent.metadata;
    const parsedAdData = JSON.parse(adData);

    // Create ad in database
    await client.models.Ad.create({
      ...parsedAdData,
      ownerId: userId,
      isActive: true,
    });
  }
}

async function handleSubscriptionPayment(invoice: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const { userId, tier } = subscription.metadata;

  // Update subscription status
  await client.models.Subscription.update({
    filter: { stripeSubscriptionId: { eq: subscription.id } },
    status: 'ACTIVE',
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionUpdate(subscription: any) {
  const { userId, tier } = subscription.metadata;

  await client.models.Subscription.update({
    filter: { stripeSubscriptionId: { eq: subscription.id } },
    status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionCancellation(subscription: any) {
  await client.models.Subscription.update({
    filter: { stripeSubscriptionId: { eq: subscription.id } },
    status: 'CANCELED',
  });
}

async function cancelSubscription(event: any, headers: any) {
  const { subscriptionId } = JSON.parse(event.body || '{}');

  try {
    await stripe.subscriptions.cancel(subscriptionId);

    await client.models.Subscription.update({
      filter: { stripeSubscriptionId: { eq: subscriptionId } },
      status: 'CANCELED',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}

async function updateSubscription(event: any, headers: any) {
  const { subscriptionId, newPriceId } = JSON.parse(event.body || '{}');

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Subscription update error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}

function getFeaturesByTier(tier: string): string[] {
  switch (tier) {
    case 'BRONZE':
      return ['basic_listing', 'contact_form', 'basic_analytics'];
    case 'SILVER':
      return ['basic_listing', 'contact_form', 'basic_analytics', 'priority_support', 'featured_badge'];
    case 'GOLD':
      return ['basic_listing', 'contact_form', 'basic_analytics', 'priority_support', 'featured_badge', 'sponsored_placement', 'advanced_analytics'];
    default:
      return ['basic_listing'];
  }
}