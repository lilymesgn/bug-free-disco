// ============================================================
// Fit Tracker PRO — Reset Password Page
// Reached via the link in the password-reset email. Supabase
// establishes a temporary "recovery" session when the link is
// opened; this page lets the user set a new password while
// that session is active.
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Dumbbell, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery session in place automatically when the
    // user lands here from the email link (detectSessionInUrl: true).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl text-white" style={{ fontWeight: 700 }}>
            Fit Tracker <span className="text-green-400">PRO</span>
          </span>
        </div>

        {hasRecoverySession === null ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : hasRecoverySession === false ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white text-sm mb-2" style={{ fontWeight: 600 }}>Invalid or expired link</p>
            <p className="text-gray-400 text-xs mb-6">
              This password reset link is no longer valid. Request a new one from the sign-in page.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              Back to sign in
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white text-sm" style={{ fontWeight: 600 }}>Password updated</p>
            <p className="text-gray-400 text-xs mt-1">Redirecting you to your dashboard…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl text-white mb-1 text-center" style={{ fontWeight: 700 }}>Set a new password</h1>
            <p className="text-gray-400 text-sm mb-8 text-center">Choose a strong password for your account</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">New password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirm new password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                />
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white rounded-xl py-3 flex items-center justify-center transition-colors"
                style={{ fontWeight: 600 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Update password'}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
