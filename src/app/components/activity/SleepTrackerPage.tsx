// ============================================================
// Fit Tracker PRO — Sleep Tracking Page
// Manual sleep log with bedtime, wake time, and quality
// rating. Shows 7-day average duration and quality score,
// plus a history list of recent entries.
// Free: log up to 7 entries total
// Premium: unlimited entries + 30-day trend chart
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Moon, Sun, Plus, Trash2, Clock, Star,
  TrendingUp, Crown, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { sleepService, type SleepEntry } from '../../services/sleepService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router';

const FREE_LIMIT = 7;

const QUALITY_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const QUALITY_COLORS: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-orange-400',
  3: 'text-yellow-400',
  4: 'text-green-400',
  5: 'text-blue-400',
};

function QualityStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`transition-colors ${
            n <= value
              ? 'text-yellow-400'
              : 'text-gray-700 hover:text-gray-500'
          } ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star className="w-5 h-5" fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function durationLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00'); // avoid tz shift
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Tonight / Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function SleepTrackerPage() {
  const { user } = useAuth();
  const { isPremium } = useFreemium();

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    sleepService.getEntries(user.id).then(e => { if (!cancelled) setEntries(e); });
    return () => { cancelled = true; };
  }, [user]);

  const [avgDuration, setAvgDuration] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      sleepService.getAverageDuration(user.id, 7),
      sleepService.getAverageQuality(user.id, 7),
    ]).then(([d, q]) => {
      if (!cancelled) { setAvgDuration(d); setAvgQuality(q); }
    });
    return () => { cancelled = true; };
  }, [user, entries]);

  const canAddMore = isPremium || entries.length < FREE_LIMIT;

  const chartData = useMemo(() => {
    const limit = isPremium ? 30 : 7;
    return entries.slice(0, limit).reverse().map(e => ({
      date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: e.durationHours,
      quality: e.quality,
    }));
  }, [entries, isPremium]);

  const handleSave = async () => {
    if (!user || !canAddMore) return;
    setIsSaving(true);
    await sleepService.saveEntry({ userId: user.id, date, bedtime, wakeTime, quality, notes: notes || undefined });
    const updated = await sleepService.getEntries(user.id);
    setEntries(updated);
    setShowForm(false);
    setNotes('');
    setQuality(3);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await sleepService.deleteEntry(user.id, id);
    setEntries(await sleepService.getEntries(user.id));
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            <Moon className="w-5 h-5 text-blue-400" /> Sleep
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Track your rest and recovery</p>
        </div>
        {!isPremium && (
          <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-2.5 py-1.5">
            <Lock className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 text-xs">{Math.max(0, FREE_LIMIT - entries.length)} entries left</span>
          </div>
        )}
      </motion.div>

      {/* 7-day summary cards */}
      {entries.length > 0 && (
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1">7-day avg duration</p>
            <p className="text-white text-xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {avgDuration > 0 ? durationLabel(avgDuration) : '—'}
            </p>
            <p className={`text-xs mt-1 ${avgDuration >= 8 ? 'text-green-400' : avgDuration >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgDuration >= 8 ? 'Optimal' : avgDuration >= 7 ? 'Adequate' : avgDuration > 0 ? 'Below target' : ''}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1">7-day avg quality</p>
            <p className="text-white text-xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {avgQuality > 0 ? avgQuality.toFixed(1) : '—'}<span className="text-gray-500 text-sm">/5</span>
            </p>
            <p className={`text-xs mt-1 ${avgQuality ? QUALITY_COLORS[Math.round(avgQuality)] : 'text-gray-600'}`}>
              {avgQuality > 0 ? QUALITY_LABELS[Math.round(avgQuality)] : ''}
            </p>
          </div>
        </motion.div>
      )}

      {/* Trend chart — premium */}
      {entries.length >= 3 && (
        <motion.div
          className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <button
            onClick={() => setShowChart(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm" style={{ fontWeight: 600 }}>Sleep Trend</span>
              {!isPremium && (
                <span className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-1.5 py-0.5">
                  <Crown className="w-3 h-3 inline mr-0.5" />30 days
                </span>
              )}
            </div>
            {showChart ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          <AnimatePresence>
            {showChart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1e9fb3" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#1e9fb3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                      <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} domain={[4, 10]} unit="h" />
                      <Tooltip
                        contentStyle={{ background: '#1a1814', border: '1px solid #38332c', borderRadius: 12, color: '#fff', fontSize: 12 }}
                        formatter={(v: number) => [durationLabel(v), 'Duration']}
                      />
                      <Area type="monotone" dataKey="hours" stroke="#1e9fb3" strokeWidth={2} fill="url(#sleepGrad)" dot={{ fill: '#1e9fb3', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {!isPremium && (
                    <p className="text-gray-600 text-xs text-center mt-2">
                      Showing last 7 nights ·{' '}
                      <Link to="/subscription" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                        Upgrade for 30-day history
                      </Link>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Log button */}
      {canAddMore ? (
        <motion.button
          onClick={() => setShowForm(s => !s)}
          className="w-full bg-blue-500/15 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors"
          style={{ fontWeight: 600 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Log Sleep'}
        </motion.button>
      ) : (
        <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-4 text-center">
          <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-white text-sm" style={{ fontWeight: 600 }}>Free limit reached</p>
          <p className="text-gray-400 text-xs mt-1 mb-3">Upgrade for unlimited sleep entries</p>
          <Link to="/subscription" className="text-xs text-green-400 hover:text-green-300 transition-colors font-semibold">
            Upgrade to Premium →
          </Link>
        </div>
      )}

      {/* Log form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Log Sleep Session</h3>

            {/* Date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Night of</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Moon className="w-3 h-3" /> Bedtime
                </label>
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Wake time
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Duration preview */}
            {bedtime && wakeTime && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-blue-300 text-xs">
                  {(() => {
                    const [bH, bM] = bedtime.split(':').map(Number);
                    const [wH, wM] = wakeTime.split(':').map(Number);
                    let bed = bH * 60 + bM, wake = wH * 60 + wM;
                    if (wake < bed) wake += 1440;
                    const hrs = ((wake - bed) / 60);
                    return `${durationLabel(Math.round(hrs * 10) / 10)} of sleep`;
                  })()}
                </span>
              </div>
            )}

            {/* Quality */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Sleep quality</label>
              <div className="flex items-center gap-3">
                <QualityStars value={quality} onChange={v => setQuality(v as 1|2|3|4|5)} />
                <span className={`text-xs ${QUALITY_COLORS[quality]}`}>{QUALITY_LABELS[quality]}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. woke up twice, had caffeine late"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder-gray-600"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save Sleep Entry'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-10">
            <Moon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>No sleep entries yet</p>
            <p className="text-gray-600 text-xs mt-1">Log your first session above to start tracking recovery</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {/* Quality dot */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                entry.quality >= 4 ? 'bg-green-500/15' : entry.quality >= 3 ? 'bg-yellow-500/15' : 'bg-red-500/15'
              }`}>
                <Moon className={`w-5 h-5 ${
                  entry.quality >= 4 ? 'text-green-400' : entry.quality >= 3 ? 'text-yellow-400' : 'text-red-400'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{formatDate(entry.date)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-400 text-xs">{entry.bedtime} → {entry.wakeTime}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-blue-400 text-xs font-semibold">{durationLabel(entry.durationHours)}</span>
                </div>
                {entry.notes && (
                  <p className="text-gray-600 text-xs mt-0.5 truncate">{entry.notes}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <QualityStars value={entry.quality} />
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
