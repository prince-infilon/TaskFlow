const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_unconfigured_stripe';
const stripe = require('stripe')(stripeApiKey);
const Organization = require('../models/Organization');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const PLAN_PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_12345_pro_mock',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_12345_ent_mock'
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ success: false, error: { message: 'Stripe billing is not configured on this server.' } });
    }

    const { plan } = req.body;
    const orgId = req.organization._id;


    if (!['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid plan selected' } });
    }

    const org = await Organization.findById(orgId);
    let customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          orgId: org._id.toString()
        }
      });
      customerId = customer.id;
      
      org.subscription = {
        ...org.subscription,
        stripeCustomerId: customerId
      };
      await org.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLAN_PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${CLIENT_URL}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/settings/billing?canceled=true`,
      metadata: {
        orgId: org._id.toString(),
        plan: plan
      }
    });

    res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    next(error);
  }
};

exports.createCustomerPortal = async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ success: false, error: { message: 'Stripe billing is not configured on this server.' } });
    }

    const orgId = req.organization._id;
    const org = await Organization.findById(orgId);

    const customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ success: false, error: { message: 'No active subscription found' } });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${CLIENT_URL}/settings/billing`,
    });

    res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata.orgId;
        const plan = session.metadata.plan;

        const org = await Organization.findById(orgId);
        if (org) {
          org.subscription.stripeSubscriptionId = session.subscription;
          org.subscription.plan = plan;
          org.subscription.status = 'active';
          await org.save();
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const org = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });
        if (org) {
          org.subscription.status = subscription.status;
          org.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          
          if (subscription.status === 'canceled') {
            org.subscription.plan = 'free'; // fallback to free
          }

          await org.save();
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Handler Error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};
