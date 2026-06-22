/// <reference types="vite/client" />

/**
 * Fit Tracker PRO — Vite environment variable type declarations.
 * All VITE_* variables defined here are available at runtime via
 * import.meta.env.VARIABLE_NAME (string | undefined).
 *
 * Copy .env.example to .env and fill in the values for your deployment.
 */
interface ImportMetaEnv {
  /**
   * Supabase project URL. Found in Project Settings → API.
   * @example "https://abcdefgh.supabase.co"
   */
  readonly VITE_SUPABASE_URL: string;

  /**
   * Supabase anon (publishable) key. Safe to expose client-side —
   * Row Level Security policies restrict what it can access.
   */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /**
   * Stripe Payment Link URL for the monthly Premium plan.
   * Create a Payment Link in your Stripe dashboard (Products → Payment Links)
   * and paste the URL here. Must start with https://buy.stripe.com/
   *
   * Set success_url = https://yourapp.com/subscription?session=success
   * Set cancel_url  = https://yourapp.com/subscription
   *
   * @example "https://buy.stripe.com/test_abc123"
   */
  readonly VITE_STRIPE_PAYMENT_LINK_MONTHLY?: string;

  /**
   * Stripe Payment Link URL for the annual Premium plan.
   * Same setup as monthly — create a separate Price and Payment Link.
   *
   * @example "https://buy.stripe.com/test_xyz789"
   */
  readonly VITE_STRIPE_PAYMENT_LINK_YEARLY?: string;

  /**
   * Optional: your app's public base URL, used when constructing
   * redirect URLs. Defaults to window.location.origin if not set.
   * Required for production deployments with custom domains.
   *
   * @example "https://fittrackerpro.app"
   */
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
