// ============================================================
// Fit Tracker PRO — Subscription Page
// Shows plan options, trial countdown, and directs users to
// Stripe Checkout for payment. No card details collected here.
// ============================================================
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useSearchParams } from 'react-router';
import {
  Check, Clock, Zap, Shield, Crown, ExternalLink,
  Settings, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { stripeService, PLANS, type PlanId } from '../../services/stripeService';

function TrialCountdown({ days }: { days: number }) {
  const pct = Math.min(100, (days / 7) * 100);
  return (
    <motion.div
      className="bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <Clock className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-white" style={{ fontWeight: 600 }}>Free Trial Active</p>
          <p className="text-gray-400 text-sm">No payment required until trial ends</p>
        </div>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <p className="text-yellow-400" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 48, lineHeight: 1 }}>{days}</p>
        <p className="text-gray-400 mb-1">days remaining</p>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-2">
        Trial ends {new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
      </p>
    </motion.div>
  );
}

export default function SubscriptionPage() {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [trialDays, setTrialDays] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.trialStartDate) setTrialDays(stripeService.getTrialDaysLeft(user.trialStartDate));
    const sub = stripeService.getSubscription(user.id);
    if (sub?.status === 'active') setIsSubscribed(true);

    // Handle Stripe redirect back with ?session=success
    if (searchParams.get('session') === 'success') {
      const pendingPlan = (localStorage.getItem('fit_pending_plan') as PlanId) || 'monthly';
      stripeService.confirmSuccessFromRedirect(user.id, pendingPlan);
      localStorage.removeItem('fit_pending_plan');
      updateUser({ subscription: 'active' });
      setIsSubscribed(true);
      setJustSubscribed(true);
    }
  }, [user, searchParams]);

  const handleSubscribe = async () => {
    setError('');
    setIsLoading(true);
    try {
      localStorage.setItem('fit_pending_plan', selectedPlan);
      stripeService.createCheckoutSession(selectedPlan);
      // Page redirects — no further code runs
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start checkout. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setIsLoading(true);
    await stripeService.cancelSubscription(user.id);
    setIsLoading(false);
    updateUser({ subscription: 'cancelled' });
    setIsSubscribed(false);
  };

  const plan = PLANS.find(p => p.id === selectedPlan)!;

  // ── Already subscribed ────────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <AnimatePresence>
          {justSubscribed && (
            <motion.div
              className="flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-2xl p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>Subscription activated</p>
                <p className="text-gray-400 text-xs">All premium features are now unlocked.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-yellow-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-yellow-400" />
          </div>
          <h1 className="text-white text-xl mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Fit Tracker PRO
          </h1>
          <p className="text-green-400 text-sm mb-4">Premium — Active</p>
          <p className="text-gray-400 text-sm">All features unlocked. Thank you for subscribing.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Manage subscription</h3>
          <p className="text-gray-400 text-xs">
            To update billing details or view invoices, use the Stripe customer portal.
          </p>
          <a
            href="https://billing.stripe.com/p/login/REPLACE_WITH_YOUR_PORTAL_LINK"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <ExternalLink className="w-4 h-4" />
            Open Billing Portal
          </a>

          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full text-red-400 hover:text-red-300 text-xs transition-colors py-2 disabled:opacity-50"
          >
            Cancel subscription
          </button>
        </div>
      </div>
    );
  }

  // ── Plan selection ────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Upgrade to Premium
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Unlock every feature. Cancel anytime.
        </p>
      </div>

      {trialDays > 0 && <TrialCountdown days={trialDays} />}

      {/* Plan toggle */}
      <div className="flex gap-3">
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlan(p.id)}
            className={`relative flex-1 rounded-2xl border-2 p-4 text-left transition-all ${
              selectedPlan === p.id
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            }`}
          >
            {p.id === 'yearly' && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full" style={{ fontWeight: 700 }}>
                BEST VALUE
              </span>
            )}
            <p className="text-white text-sm mb-0.5" style={{ fontWeight: 600 }}>{p.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                ${p.price}
              </span>
              <span className="text-gray-500 text-xs mb-1">{p.period}</span>
            </div>
            {p.perMonth && (
              <p className="text-green-400 text-xs mt-0.5">{p.perMonth}</p>
            )}
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>
          {plan.name} includes
        </h3>
        <div className="space-y-2.5">
          {plan.features.map(f => (
            <div key={f} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-2xl p-4"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 text-sm" style={{ fontWeight: 600 }}>Could not start checkout</p>
              <p className="text-red-400/80 text-xs mt-1">{error}</p>
              <p className="text-gray-500 text-xs mt-2">
                To enable payments, add your Stripe Payment Link URLs to the .env file.
                See <code className="bg-gray-800 px-1 rounded text-gray-400">VITE_STRIPE_PAYMENT_LINK_MONTHLY</code> in the readme.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
        style={{ fontWeight: 700 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Continue to Payment — ${plan.price}/{plan.id === 'monthly' ? 'mo' : 'yr'}
          </>
        )}
      </motion.button>

      <div className="flex items-center justify-center gap-2 text-gray-600 text-xs">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured by Stripe · 256-bit SSL · Cancel anytime</span>
      </div>
    </div>
  );
}
