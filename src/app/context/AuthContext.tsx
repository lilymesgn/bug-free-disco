// ============================================================
// Fit Tracker PRO — Auth Context (Supabase Auth)
// Real authentication backed by Supabase. Session is managed
// by the Supabase client (stored in localStorage under the
// hood by the SDK itself, with auto-refresh). The `profiles`
// table holds app-specific fields and is kept in sync here.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { stripeService } from '../services/stripeService';
import type { User, Gender, FitnessGoal } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  gender: Gender;
  goal?: FitnessGoal;
  weight?: number;
  height?: number;
  preferredUnit?: 'metric' | 'imperial';
}

// ─── DB row shape (snake_case) → app User (camelCase) ─────────────────────────
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  gender: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  goal: string;
  preferred_unit: string;
  subscription: string;
  trial_start_date: string | null;
  avatar_url: string | null;
  created_at: string;
}

function rowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    gender: row.gender as Gender,
    age: row.age ?? undefined,
    weight: row.weight ?? undefined,
    height: row.height ?? undefined,
    goal: row.goal as FitnessGoal,
    preferredUnit: row.preferred_unit as 'metric' | 'imperial',
    subscription: row.subscription as User['subscription'],
    trialStartDate: row.trial_start_date ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

function userPatchToRow(data: Partial<User>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.gender !== undefined) row.gender = data.gender;
  if (data.age !== undefined) row.age = data.age;
  if (data.weight !== undefined) row.weight = data.weight;
  if (data.height !== undefined) row.height = data.height;
  if (data.goal !== undefined) row.goal = data.goal;
  if (data.preferredUnit !== undefined) row.preferred_unit = data.preferredUnit;
  if (data.subscription !== undefined) row.subscription = data.subscription;
  if (data.trialStartDate !== undefined) row.trial_start_date = data.trialStartDate;
  if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl;
  return row;
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return rowToUser(data as ProfileRow);
}

// ─── Reconcile subscription state on load (trial expiry + Stripe sync) ────────
async function reconcileSubscription(u: User): Promise<User> {
  let resolved = { ...u };
  let changed = false;

  if (resolved.subscription === 'trial' && resolved.trialStartDate) {
    if (stripeService.isTrialExpired(resolved.trialStartDate)) {
      resolved.subscription = 'none';
      changed = true;
    }
  }

  const stripeSub = stripeService.getSubscription(resolved.id);
  if (stripeSub?.status === 'active' && resolved.subscription !== 'active') {
    resolved.subscription = 'active';
    changed = true;
  }
  if (stripeSub?.status === 'cancelled' && resolved.subscription === 'active') {
    resolved.subscription = 'cancelled';
    changed = true;
  }

  if (changed) {
    await supabase
      .from('profiles')
      .update({ subscription: resolved.subscription })
      .eq('id', resolved.id);
  }

  return resolved;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileForSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setToken(null);
      return;
    }
    setToken(session.access_token);

    // The handle_new_user() trigger creates the profile row on signup, but
    // there can be a brief delay — retry a couple of times before giving up.
    let profile = await fetchProfile(session.user.id);
    for (let attempt = 0; !profile && attempt < 3; attempt++) {
      await new Promise(r => setTimeout(r, 400));
      profile = await fetchProfile(session.user.id);
    }
    if (!profile) {
      setUser(null);
      return;
    }

    const reconciled = await reconcileSubscription(profile);
    setUser(reconciled);
  }, []);

  // Restore session on load + subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      await loadProfileForSession(session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await loadProfileForSession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfileForSession]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const friendly = error.message.includes('Invalid login credentials')
        ? 'Incorrect email or password.'
        : error.message;
      return { success: false, error: friendly };
    }
    await loadProfileForSession(data.session);
    return { success: true };
  }, [loadProfileForSession]);

  // ── Login with Google ───────────────────────────────────────────────────────
  // Redirects to Google's consent screen; Supabase handles the OAuth dance
  // and redirects back with a session token in the URL, which the client
  // (detectSessionInUrl: true) picks up automatically — onAuthStateChange
  // above fires and loadProfileForSession runs as normal.
  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true }; // browser is navigating away; this return rarely matters
  }, []);

  // ── Signup ──────────────────────────────────────────────────────────────────
  const signup = useCallback(async (data: SignupData) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          gender: data.gender,
          goal: data.goal || 'get_fit',
          weight: data.weight ?? '',
          height: data.height ?? '',
          preferred_unit: data.preferredUnit || 'metric',
        },
      },
    });

    if (error) {
      const friendly = error.message.includes('already registered')
        ? 'An account with this email already exists.'
        : error.message;
      return { success: false, error: friendly };
    }

    if (!signUpData.session) {
      // Email confirmation is enabled in the Supabase project settings
      return {
        success: false,
        error: 'Account created — check your email to confirm before signing in.',
      };
    }

    await loadProfileForSession(signUpData.session);
    return { success: true };
  }, [loadProfileForSession]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
    setToken(null);
  }, []);

  // ── Update user ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated); // optimistic update

    const row = userPatchToRow(data);
    if (Object.keys(row).length === 0) return;

    supabase
      .from('profiles')
      .update(row)
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to update profile:', error.message);
      });
  }, [user]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
