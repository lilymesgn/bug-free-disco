// ============================================================
// Fit Tracker PRO — Stripe Subscription Service
// Handles subscription state in localStorage (source of truth
// until a real backend is connected).
//
// PAYMENT FLOW:
//   stripeService.createCheckoutSession(planId) — builds a
//   Stripe Checkout URL from env var VITE_STRIPE_PAYMENT_LINK_*
//   and redirects the browser there. Stripe handles card entry,
//   PCI compliance, and confirmation. On success, Stripe
//   redirects back to /subscription?session=success.
//
//   If no payment link is configured, the function throws and
//   SubscriptionPage catches it, showing a "not yet configured"
//   message — never a fake card form.
//
// TO CONNECT STRIPE:
//   1. Create a Product + Price in your Stripe dashboard
//   2. Create a Payment Link for each price
//   3. Add to .env:
//        VITE_STRIPE_PAYMENT_LINK_MONTHLY=https://buy.stripe.com/...
//        VITE_STRIPE_PAYMENT_LINK_YEARLY=https://buy.stripe.com/...
//   4. Set success_url and cancel_url in the Payment Link settings:
//        success_url = https://yourapp.com/subscription?session=success
//        cancel_url  = https://yourapp.com/subscription
// ============================================================

export type PlanId = 'monthly' | 'yearly';

/** Features available on the free tier, shown in plan comparison UI */
export const FREE_FEATURES: string[] = [
  'Dashboard & workout tracking',
  'Basic calorie tracking (3 entries/day)',
  'AI Coach — 5 messages/day',
  'Workout history (last 10 sessions)',
  'Sleep tracking (7 entries)',
];

interface Plan {
  id: PlanId;
  name: string;
  price: number;
  period: string;
  perMonth?: string;
  features: string[];
  stripePriceId: string;
  envKey: string; // VITE_ env var holding the Stripe Payment Link URL
}

export const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    price: 4.99,
    period: 'per month',
    stripePriceId: 'price_REPLACE_WITH_REAL_ID',
    envKey: 'VITE_STRIPE_PAYMENT_LINK_MONTHLY',
    features: [
      'Unlimited AI Coach messages',
      'AI Meal Scanner (Gemini Vision)',
      'AI Form Analyzer',
      'GPS run tracking with route map',
      'Full macro & fiber tracking',
      '30-day analytics',
      'Body measurements',
      'Data export (CSV)',
      'Priority support',
    ],
  },
  {
    id: 'yearly',
    name: 'Premium Annual',
    price: 39.99,
    period: 'per year',
    perMonth: '$3.33/mo',
    stripePriceId: 'price_REPLACE_WITH_REAL_ID_YEARLY',
    envKey: 'VITE_STRIPE_PAYMENT_LINK_YEARLY',
    features: [
      'Everything in Monthly',
      '33% discount vs monthly billing',
      'Priority feature requests',
    ],
  },
];

export const stripeService = {
  getTrialDaysLeft(trialStartDate: string): number {
    const start = new Date(trialStartDate).getTime();
    const elapsed = Math.floor((Date.now() - start) / 86_400_000);
    return Math.max(0, 7 - elapsed);
  },

  isTrialExpired(trialStartDate: string): boolean {
    return stripeService.getTrialDaysLeft(trialStartDate) === 0;
  },

  getSubscription(userId: string) {
    const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
      JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
    return subs[userId] || null;
  },

  /**
   * Redirect to Stripe Checkout / Payment Link.
   * Reads the payment link URL from Vite env vars.
   * Throws with a user-readable message if not configured.
   */
  createCheckoutSession(planId: PlanId): void {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Unknown plan.');

    // Read the Stripe Payment Link URL from Vite env (typed in src/vite-env.d.ts)
    const url = import.meta.env[plan.envKey as keyof ImportMetaEnv] as string | undefined;

    if (!url || !url.startsWith('http')) {
      throw new Error(
        'Payment is not yet configured for this deployment. ' +
        'Add VITE_STRIPE_PAYMENT_LINK_MONTHLY / _YEARLY to your .env file.'
      );
    }

    // Hard redirect — Stripe handles the session
    window.location.href = url;
  },

  /**
   * Called after Stripe redirects back with ?session=success.
   * Marks the user as subscribed locally until the webhook
   * (or a backend reconcile) updates the server record.
   */
  confirmSuccessFromRedirect(userId: string, planId: PlanId): void {
    const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
      JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
    subs[userId] = { plan: planId, startDate: new Date().toISOString(), status: 'active' };
    localStorage.setItem('fit_subscriptions', JSON.stringify(subs));
  },

  async cancelSubscription(userId: string): Promise<void> {
    const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
      JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
    if (subs[userId]) {
      subs[userId].status = 'cancelled';
      localStorage.setItem('fit_subscriptions', JSON.stringify(subs));
    }
  },
};
