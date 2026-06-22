// ============================================================
// Fit Tracker PRO — Progress Service (Supabase)
// Manages:
//   • Personal Records (PRs) per exercise
//   • Workout sessions from the builder
//   • Body measurement logs
//   • Strength progress charts
// All reads/writes go to Supabase Postgres, scoped to the
// signed-in user via Row Level Security.
// ============================================================
import { supabase } from './supabaseClient';
import type { PersonalRecord, WorkoutSession, BodyMeasurement, ExerciseLog } from '../types';

// ─── Row ↔ App-type mappers ────────────────────────────────────────────────────
function prRowToType(r: any): PersonalRecord {
  return {
    id: r.id, userId: r.user_id, exerciseId: r.exercise_id, exerciseName: r.exercise_name,
    type: r.type, value: Number(r.value), unit: r.unit, date: r.date, workoutId: r.workout_id || '',
  };
}

function sessionRowToType(r: any): WorkoutSession {
  return {
    id: r.id, userId: r.user_id, planName: r.plan_name, category: r.category,
    exerciseLogs: r.exercise_logs || [], startTime: r.start_time, endTime: r.end_time || undefined,
    duration: r.duration, totalCalories: r.total_calories, newPRs: r.new_prs || [], notes: r.notes || undefined,
  };
}

function measurementRowToType(r: any): BodyMeasurement {
  return {
    id: r.id, userId: r.user_id, date: r.date,
    weight: r.weight ?? undefined, bodyFat: r.body_fat ?? undefined,
    chest: r.chest ?? undefined, waist: r.waist ?? undefined,
    hips: r.hips ?? undefined, arms: r.arms ?? undefined, legs: r.legs ?? undefined,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Personal Records
// ════════════════════════════════════════════════════════════════════════════
export const prService = {
  async getPRs(userId: string): Promise<PersonalRecord[]> {
    const { data, error } = await supabase
      .from('personal_records').select('*').eq('user_id', userId);
    if (error) { console.error('getPRs:', error.message); return []; }
    return (data || []).map(prRowToType);
  },

  async getPR(userId: string, exerciseId: string, type: PersonalRecord['type']): Promise<PersonalRecord | null> {
    const { data, error } = await supabase
      .from('personal_records').select('*')
      .eq('user_id', userId).eq('exercise_id', exerciseId).eq('type', type)
      .maybeSingle();
    if (error || !data) return null;
    return prRowToType(data);
  },

  /**
   * Check if an exercise log contains new PRs and upsert them.
   * Returns array of exercise names that hit new records.
   */
  async checkAndSavePRs(userId: string, exerciseLogs: ExerciseLog[], workoutId: string): Promise<string[]> {
    const existing = await prService.getPRs(userId);
    const newPRNames: string[] = [];
    const upserts: any[] = [];

    for (const log of exerciseLogs) {
      if (!log.sets?.length) continue;
      const completedSets = log.sets.filter(s => s.completed);
      if (!completedSets.length) continue;

      if (log.isTimed) {
        const maxDuration = Math.max(...completedSets.map(s => s.duration || 0));
        if (maxDuration > 0) {
          const cur = existing.find(p => p.exerciseId === log.exerciseId && p.type === 'duration');
          if (!cur || maxDuration > cur.value) {
            upserts.push({
              user_id: userId, exercise_id: log.exerciseId, exercise_name: log.exerciseName,
              type: 'duration', value: maxDuration, unit: 'seconds',
              date: new Date().toISOString(), workout_id: workoutId,
            });
            newPRNames.push(log.exerciseName);
          }
        }
      } else {
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        if (maxWeight > 0) {
          const cur = existing.find(p => p.exerciseId === log.exerciseId && p.type === 'weight');
          if (!cur || maxWeight > cur.value) {
            upserts.push({
              user_id: userId, exercise_id: log.exerciseId, exercise_name: log.exerciseName,
              type: 'weight', value: maxWeight, unit: 'kg',
              date: new Date().toISOString(), workout_id: workoutId,
            });
            newPRNames.push(log.exerciseName);
          }
        }

        const maxReps = Math.max(...completedSets.map(s => s.reps || 0));
        if (maxReps > 0) {
          const cur = existing.find(p => p.exerciseId === log.exerciseId && p.type === 'reps');
          if (!cur || maxReps > cur.value) {
            upserts.push({
              user_id: userId, exercise_id: log.exerciseId, exercise_name: log.exerciseName,
              type: 'reps', value: maxReps, unit: 'reps',
              date: new Date().toISOString(), workout_id: workoutId,
            });
            if (!newPRNames.includes(log.exerciseName)) newPRNames.push(log.exerciseName);
          }
        }
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('personal_records')
        .upsert(upserts, { onConflict: 'user_id,exercise_id,type' });
      if (error) console.error('checkAndSavePRs upsert:', error.message);
    }

    return [...new Set(newPRNames)];
  },

  async getRecentPRs(userId: string, limit = 5): Promise<PersonalRecord[]> {
    const { data, error } = await supabase
      .from('personal_records').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(limit);
    if (error) return [];
    return (data || []).map(prRowToType);
  },

  async deletePR(userId: string, prId: string): Promise<void> {
    await supabase.from('personal_records').delete().eq('id', prId).eq('user_id', userId);
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Workout Sessions
// ════════════════════════════════════════════════════════════════════════════
export const sessionService = {
  async saveSession(session: WorkoutSession): Promise<void> {
    const { error } = await supabase.from('workout_sessions').insert({
      id: session.id, user_id: session.userId, plan_name: session.planName,
      category: session.category, exercise_logs: session.exerciseLogs || [],
      start_time: session.startTime, end_time: session.endTime,
      duration: session.duration, total_calories: session.totalCalories,
      new_prs: session.newPRs || [], notes: session.notes,
    });
    if (error) console.error('saveSession:', error.message);
  },

  async getSessions(userId: string): Promise<WorkoutSession[]> {
    const { data, error } = await supabase
      .from('workout_sessions').select('*').eq('user_id', userId)
      .order('start_time', { ascending: false });
    if (error) { console.error('getSessions:', error.message); return []; }
    return (data || []).map(sessionRowToType);
  },

  async getSessionsInRange(userId: string, startDate: Date, endDate: Date): Promise<WorkoutSession[]> {
    const { data, error } = await supabase
      .from('workout_sessions').select('*').eq('user_id', userId)
      .gte('start_time', startDate.toISOString()).lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false });
    if (error) return [];
    return (data || []).map(sessionRowToType);
  },

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await supabase.from('workout_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  },

  async getStrengthProgress(userId: string, exerciseName: string): Promise<Array<{ date: string; maxWeight: number; totalVolume: number }>> {
    const sessions = await sessionService.getSessions(userId);
    return sessions
      .map(session => {
        const log = session.exerciseLogs?.find(l => l.exerciseName.toLowerCase() === exerciseName.toLowerCase());
        if (!log) return null;
        const completedSets = log.sets.filter(s => s.completed);
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        const totalVolume = completedSets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
        return {
          date: new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          maxWeight, totalVolume,
        };
      })
      .filter(Boolean) as Array<{ date: string; maxWeight: number; totalVolume: number }>;
  },

  async getSessionStats(userId: string, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const sessions = await sessionService.getSessionsInRange(userId, cutoff, new Date());

    const categoryCount = sessions.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((s, w) => s + (w.duration || 0), 0),
      totalCalories: sessions.reduce((s, w) => s + (w.totalCalories || 0), 0),
      categoryBreakdown: categoryCount,
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Body Measurements
// ════════════════════════════════════════════════════════════════════════════
export const measurementService = {
  async saveMeasurement(measurement: Omit<BodyMeasurement, 'id'>): Promise<BodyMeasurement> {
    const { data, error } = await supabase.from('body_measurements').insert({
      user_id: measurement.userId, date: measurement.date,
      weight: measurement.weight, body_fat: measurement.bodyFat,
      chest: measurement.chest, waist: measurement.waist,
      hips: measurement.hips, arms: measurement.arms, legs: measurement.legs,
    }).select().single();

    if (error || !data) {
      console.error('saveMeasurement:', error?.message);
      return { ...measurement, id: crypto.randomUUID() };
    }
    return measurementRowToType(data);
  },

  async getMeasurements(userId: string): Promise<BodyMeasurement[]> {
    const { data, error } = await supabase
      .from('body_measurements').select('*').eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) { console.error('getMeasurements:', error.message); return []; }
    return (data || []).map(measurementRowToType);
  },

  async getWeightTrend(userId: string, limit = 10): Promise<Array<{ date: string; weight: number }>> {
    const measurements = await measurementService.getMeasurements(userId);
    return measurements
      .filter(m => m.weight !== undefined)
      .slice(0, limit)
      .reverse()
      .map(m => ({
        date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight!,
      }));
  },
};
