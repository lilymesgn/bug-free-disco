// ============================================================
// Fit Tracker PRO — Workout History Page
// Chronological list of all logged workouts and sessions.
// Free: last 10 entries visible
// Premium: full history + session detail expand
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell, Clock, Flame, ChevronDown, ChevronUp,
  Crown, Lock, Filter, Calendar, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { workoutService } from '../../services/workoutService';
import { sessionService } from '../../services/progressService';
import type { WorkoutSession, Workout } from '../../types';

type FilterCat = 'all' | 'strength' | 'cardio' | 'hiit' | 'yoga' | 'sports' | 'flexibility';

const FREE_LIMIT = 10;

const CAT_COLORS: Record<string, string> = {
  strength:    'text-orange-400 bg-orange-500/15 border-orange-500/20',
  cardio:      'text-blue-400 bg-blue-500/15 border-blue-500/20',
  hiit:        'text-red-400 bg-red-500/15 border-red-500/20',
  yoga:        'text-purple-400 bg-purple-500/15 border-purple-500/20',
  flexibility: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
  sports:      'text-green-400 bg-green-500/15 border-green-500/20',
};

function catColor(cat: string): string {
  return CAT_COLORS[cat?.toLowerCase()] || 'text-gray-400 bg-gray-800 border-gray-700';
}

function formatRelDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
}

// Normalised view model merging both data sources
interface HistoryEntry {
  id: string;
  name: string;
  category: string;
  date: string;       // ISO
  duration: number;   // minutes
  calories: number;
  sets?: number;
  newPRs?: string[];
  exercises?: { name: string; sets: number }[];
  source: 'session' | 'legacy';
}

function fromSession(s: WorkoutSession): HistoryEntry {
  const totalSets = s.exerciseLogs?.reduce((acc, l) => acc + l.sets.filter(set => set.completed).length, 0) || 0;
  const exercises = s.exerciseLogs?.map(l => ({ name: l.exerciseName, sets: l.sets.filter(set => set.completed).length })) || [];
  return {
    id: s.id,
    name: s.planName,
    category: s.category,
    date: s.startTime,
    duration: s.duration,
    calories: s.totalCalories,
    sets: totalSets,
    newPRs: s.newPRs,
    exercises,
    source: 'session',
  };
}

function fromLegacy(w: Workout): HistoryEntry {
  return {
    id: w.id,
    name: w.name,
    category: w.category || 'strength',
    date: w.date,
    duration: w.duration,
    calories: w.calories,
    exercises: w.exercises?.map(e => ({ name: e.name, sets: e.sets })),
    source: 'legacy',
  };
}

function SessionCard({ entry, canExpand }: { entry: HistoryEntry; canExpand: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const catClass = catColor(entry.category);

  return (
    <motion.div
      className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
      layout
    >
      <button
        onClick={() => canExpand && setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/40 transition-colors"
      >
        {/* Category icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${catClass}`}>
          <Dumbbell className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{entry.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-500 text-xs">{formatRelDate(entry.date)}</span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-gray-500 text-xs capitalize">{entry.category}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-gray-600" />
              <span className="text-gray-400 text-xs">{entry.duration}m</span>
            </div>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-gray-400 text-xs">{entry.calories}</span>
            </div>
          </div>
          {canExpand && entry.exercises && entry.exercises.length > 0 && (
            expanded
              ? <ChevronUp className="w-4 h-4 text-gray-600" />
              : <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </button>

      {/* Expanded exercises */}
      <AnimatePresence>
        {expanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-gray-800 pt-3">
              {/* PRs */}
              {entry.newPRs && entry.newPRs.length > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-yellow-400 text-xs">
                    New PR{entry.newPRs.length > 1 ? 's' : ''}: {entry.newPRs.join(', ')}
                  </span>
                </div>
              )}

              {/* Exercise list */}
              {entry.exercises?.map(ex => (
                <div key={ex.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{ex.name}</span>
                  <span className="text-gray-600">{ex.sets} set{ex.sets !== 1 ? 's' : ''}</span>
                </div>
              ))}

              {entry.sets !== undefined && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-800">
                  <span className="text-gray-500">Total sets completed</span>
                  <span className="text-gray-300" style={{ fontWeight: 600 }}>{entry.sets}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium gate on expand */}
      {!canExpand && entry.exercises && entry.exercises.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-800 pt-2.5 flex items-center justify-between">
          <span className="text-gray-600 text-xs">{entry.exercises.length} exercises logged</span>
          <Link to="/subscription" className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
            <Crown className="w-3 h-3" /> Upgrade to view
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export default function WorkoutHistoryPage() {
  const { user } = useAuth();
  const { isPremium } = useFreemium();
  const [filter, setFilter] = useState<FilterCat>('all');
  const [allEntries, setAllEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      sessionService.getSessions(user.id),
      workoutService.getWorkouts(user.id),
    ]).then(([sessions, legacy]) => {
      if (cancelled) return;
      const combined = [...sessions.map(fromSession), ...legacy.map(fromLegacy)].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAllEntries(combined);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? allEntries : allEntries.filter(e => e.category === filter);
    return isPremium ? base : base.slice(0, FREE_LIMIT);
  }, [allEntries, filter, isPremium]);

  const FILTERS: FilterCat[] = ['all', 'strength', 'cardio', 'hiit', 'yoga', 'sports'];

  const totalCalories = allEntries.reduce((s, e) => s + e.calories, 0);
  const totalDuration = allEntries.reduce((s, e) => s + e.duration, 0);

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          <Calendar className="w-5 h-5 text-green-400" /> Workout History
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">{allEntries.length} sessions logged</p>
      </motion.div>

      {/* Summary strip */}
      {allEntries.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {[
            { label: 'Total sessions', value: String(allEntries.length), icon: Dumbbell },
            { label: 'Total time', value: `${Math.round(totalDuration / 60)}h`, icon: Clock },
            { label: 'Cal burned', value: totalCalories.toLocaleString(), icon: Flame },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
              <stat.icon className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-white text-base" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{stat.value}</p>
              <p className="text-gray-600 text-xs">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filter chips */}
      {allEntries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-gray-700'
              }`}
              style={{ fontWeight: filter === f ? 600 : 400 }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Free limit notice */}
      {!isPremium && allEntries.length > FREE_LIMIT && (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-xs">Showing last {FREE_LIMIT} of {allEntries.length} sessions</span>
          </div>
          <Link to="/subscription" className="text-xs text-green-400 hover:text-green-300 transition-colors font-semibold">
            Upgrade
          </Link>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>No sessions logged yet</p>
          <p className="text-gray-600 text-xs mt-1">Complete a workout to see it here</p>
          <Link
            to="/workout"
            className="inline-flex items-center gap-2 mt-4 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Start a workout
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <SessionCard entry={entry} canExpand={isPremium} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
