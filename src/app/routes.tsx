// ============================================================
// Fit Tracker PRO — React Router v7 Route Definitions
// Heavy pages (TensorFlow / Three.js) are React.lazy loaded
// so a single module failure never crashes the whole app.
// ============================================================
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// ── Lightweight pages: static imports ────────────────────────────────────────
import Dashboard from './components/dashboard/Dashboard';
import CalorieTrackerPage from './components/calories/CalorieTrackerPage';
import RunTrackerPage from './components/activity/RunTrackerPage';
import SleepTrackerPage from './components/activity/SleepTrackerPage';
import WorkoutHistoryPage from './components/workout/WorkoutHistoryPage';
import MealPlanPage from './components/meals/MealPlanPage';
import GroceryListPage from './components/meals/GroceryListPage';
import SubscriptionPage from './components/subscription/SubscriptionPage';
import NotFoundPage from './components/auth/NotFoundPage';
import UserProfile from './components/profile/UserProfile';
import ProgressPage from './components/progress/ProgressPage';

// ── Heavy pages: lazy-loaded to isolate TF.js / Three.js failures ─────────────
const LoginPage        = lazy(() => import('./components/auth/LoginPage'));
const SignupPage       = lazy(() => import('./components/auth/SignupPage'));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage'));
const MealScannerPage  = lazy(() => import('./components/meals/MealScannerPage'));
const FormAnalyzerPage = lazy(() => import('./components/form-analyzer/FormAnalyzerPage'));
const AITrainerChat    = lazy(() => import('./components/ai-trainer/AITrainerChat'));

// ── Medium pages: lazy-loaded for code splitting (no TF.js) ──────────────────
const WorkoutBuilderPage = lazy(() => import('./components/workout/WorkoutBuilderPage'));

// ── Shared fallback spinner ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ── Lazy-page wrapper ─────────────────────────────────────────────────────────
import { PageErrorBoundary } from './components/shared/PageErrorBoundary';

function LazyPage({ children, pageName }: { children: React.ReactNode; pageName?: string }) {
  return (
    <PageErrorBoundary pageName={pageName}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  );
}

export const router = createBrowserRouter([
  // ── Public routes ───────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LazyPage pageName="Login"><LoginPage /></LazyPage>,
  },
  {
    path: '/signup',
    element: <LazyPage pageName="Sign Up"><SignupPage /></LazyPage>,
  },
  {
    path: '/reset-password',
    element: <LazyPage pageName="Reset Password"><ResetPasswordPage /></LazyPage>,
  },

  // ── Protected routes (require authentication) ───────────────────────────
  {
    path: '/',
    Component: ProtectedRoute,
    children: [
      {
        // Layout wraps all protected pages with TopBar + BottomNav
        Component: Layout,
        children: [
          // Default redirect to dashboard
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',     Component: Dashboard },
          { path: 'calories',      Component: CalorieTrackerPage },
          { path: 'meal-plan',     Component: MealPlanPage },
          { path: 'grocery-list',  Component: GroceryListPage },
          { path: 'activity',      Component: RunTrackerPage },
          { path: 'sleep',         Component: SleepTrackerPage },
          { path: 'history',       Component: WorkoutHistoryPage },
          { path: 'progress',      Component: ProgressPage },
          {
            path: 'workout',
            element: <LazyPage pageName="Workout Builder"><WorkoutBuilderPage /></LazyPage>,
          },
          {
            path: 'meals',
            element: <LazyPage pageName="Meal Scanner"><MealScannerPage /></LazyPage>,
          },
          {
            path: 'form-analyzer',
            element: <LazyPage pageName="Form Analyzer"><FormAnalyzerPage /></LazyPage>,
          },
          {
            path: 'ai-trainer',
            element: <LazyPage pageName="AI Coach"><AITrainerChat /></LazyPage>,
          },
          { path: 'subscription',  Component: SubscriptionPage },
          { path: 'profile',       Component: UserProfile },
        ],
      },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: '*', Component: NotFoundPage },
]);
