// ============================================================
// Fit Tracker PRO — Run Tracking Service (Supabase)
// Stores completed GPS run sessions: distance, pace, calories,
// steps, and the recorded route (lat/lon points).
// ============================================================
import { supabase } from './supabaseClient';

export interface RunSession {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number;    // seconds
  distance: number;    // km
  pace: string;        // e.g. "5:30"
  calories: number;
  steps: number;
  avgHeartRate?: number;
  route?: Array<{ lat: number; lon: number }>;
}

function rowToSession(r: any): RunSession {
  return {
    id: r.id, userId: r.user_id, startTime: r.start_time, endTime: r.end_time,
    duration: r.duration, distance: Number(r.distance), pace: r.pace,
    calories: r.calories, steps: r.steps,
    avgHeartRate: r.avg_heart_rate ?? undefined,
    route: r.route || [],
  };
}

export const runService = {
  async getSessions(userId: string): Promise<RunSession[]> {
    const { data, error } = await supabase
      .from('run_sessions').select('*').eq('user_id', userId)
      .order('start_time', { ascending: false });
    if (error) { console.error('getSessions:', error.message); return []; }
    return (data || []).map(rowToSession);
  },

  async saveSession(userId: string, session: Omit<RunSession, 'id' | 'userId'>): Promise<RunSession | null> {
    const { data, error } = await supabase.from('run_sessions').insert({
      user_id: userId, start_time: session.startTime, end_time: session.endTime,
      duration: session.duration, distance: session.distance, pace: session.pace,
      calories: session.calories, steps: session.steps,
      avg_heart_rate: session.avgHeartRate, route: session.route || [],
    }).select().single();

    if (error || !data) { console.error('saveSession:', error?.message); return null; }
    return rowToSession(data);
  },

  async deleteSession(userId: string, id: string): Promise<void> {
    await supabase.from('run_sessions').delete().eq('id', id).eq('user_id', userId);
  },
};
