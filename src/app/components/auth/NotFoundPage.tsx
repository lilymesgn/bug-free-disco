// ============================================================
// Fit Tracker PRO — 404 Not Found Page
// Friendly page for unknown routes.
// ============================================================
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Dumbbell, Home, ChevronLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 max-w-sm"
      >
        {/* Icon */}
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center mx-auto">
          <Dumbbell className="w-10 h-10 text-green-400" />
        </div>

        {/* Copy */}
        <div>
          <p className="text-green-400 text-sm font-semibold tracking-widest mb-2">404</p>
          <h1 className="text-white text-2xl mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Page not found
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Looks like this page skipped leg day. Head back to the dashboard and keep going.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3.5 font-semibold transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-2xl py-3 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
