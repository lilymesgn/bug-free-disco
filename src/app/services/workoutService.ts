// ============================================================
// Fit Tracker PRO — Workout Service (Supabase)
// Legacy/simple workout logging + aggregated dashboard stats.
// Merges with workout_sessions (from the AI builder) for a
// complete picture of streak, calories, and progress charts.
// ============================================================
import { supabase } from './supabaseClient';
import type { Workout, DailyProgress } from '../types';
import { sessionService } from './progressService';

function rowToWorkout(r: any): Workout {
  return {
    id: r.id, userId: r.user_id, name: r.name,
    exercises: r.exercises || [], duration: r.duration, calories: r.calories,
    date: r.date, notes: r.notes || undefined, category: r.category || undefined,
  };
}

export const workoutService = {
  async getWorkouts(userId: string): Promise<Workout[]> {
    const { data, error } = await supabase
      .from('workouts').select('*').eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) { console.error('getWorkouts:', error.message); return []; }
    return (data || []).map(rowToWorkout);
  },

  async saveWorkout(userId: string, workout: Omit<Workout, 'id' | 'userId'>): Promise<Workout> {
    const { data, error } = await supabase.from('workouts').insert({
      user_id: userId, name: workout.name, exercises: workout.exercises,
      duration: workout.duration, calories: workout.calories,
      date: workout.date, notes: workout.notes, category: workout.category,
    }).select().single();

    if (error || !data) {
      console.error('saveWorkout:', error?.message);
      return { ...workout, id: crypto.randomUUID(), userId };
    }
    return rowToWorkout(data);
  },

  async deleteWorkout(id: string): Promise<void> {
    await supabase.from('workouts').delete().eq('id', id);
  },

  /** Get aggregated stats for dashboard — merges legacy workouts + sessions */
  async getStats(userId: string) {
    const [workouts, sessions] = await Promise.all([
      workoutService.getWorkouts(userId),
      sessionService.getSessions(userId),
    ]);

    const totalCalories = workouts.reduce((s, w) => s + w.calories, 0);
    const totalDuration = workouts.reduce((s, w) => s + w.duration, 0);

    const sessionDateStrings = new Set(sessions.map(s => new Date(s.startTime).toDateString()));
    const workoutDateStrings = new Set(workouts.map(w => new Date(w.date).toDateString()));
    const allActiveDates = new Set([...sessionDateStrings, ...workoutDateStrings]);

    // Streak: consecutive days with activity, counting back from today
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      if (allActiveDates.has(ds)) streak++;
      else if (i > 0) break;
    }

    // Last 30 days progress — merge calories from both sources
    const progressData: DailyProgress[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toDateString();
      const dayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === ds);
      const daySessions = sessions.filter(s => new Date(s.startTime).toDateString() === ds);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories:
          dayWorkouts.reduce((s, w) => s + w.calories, 0) +
          daySessions.reduce((s, sess) => s + sess.totalCalories, 0),
        workouts: dayWorkouts.length + daySessions.length,
      };
    });

    const sessionCalories = sessions.reduce((s, sess) => s + sess.totalCalories, 0);
    const sessionDuration = sessions.reduce((s, sess) => s + sess.duration, 0);

    return {
      totalWorkouts: workouts.length + sessions.length,
      totalCalories: totalCalories + sessionCalories,
      totalDuration: totalDuration + sessionDuration,
      streak,
      progressData,
    };
  },
};
