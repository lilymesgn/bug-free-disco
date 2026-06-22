// ============================================================
// Fit Tracker PRO — Sleep Tracking Service (Supabase)
// Manual sleep log: bedtime, wake time, quality rating (1-5).
// ============================================================
import { supabase } from './supabaseClient';

export interface SleepEntry {
  id: string;
  userId: string;
  date: string;        // "YYYY-MM-DD" — the night of
  bedtime: string;     // "HH:MM" 24h
  wakeTime: string;    // "HH:MM" 24h
  durationHours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

function rowToEntry(r: any): SleepEntry {
  return {
    id: r.id, userId: r.user_id, date: r.sleep_date,
    bedtime: r.bedtime, wakeTime: r.wake_time,
    durationHours: Number(r.duration_hours), quality: r.quality,
    notes: r.notes || undefined,
  };
}

function calcDuration(bedtime: string, wakeTime: string): number {
  const [bH, bM] = bedtime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  const bedMins = bH * 60 + bM;
  let wakeMins = wH * 60 + wM;
  if (wakeMins < bedMins) wakeMins += 24 * 60;
  return Math.round(((wakeMins - bedMins) / 60) * 10) / 10;
}

export const sleepService = {
  async getEntries(userId: string): Promise<SleepEntry[]> {
    const { data, error } = await supabase
      .from('sleep_entries').select('*').eq('user_id', userId)
      .order('sleep_date', { ascending: false });
    if (error) { console.error('getEntries:', error.message); return []; }
    return (data || []).map(rowToEntry);
  },

  async saveEntry(entry: Omit<SleepEntry, 'id' | 'durationHours'>): Promise<SleepEntry> {
    const duration = calcDuration(entry.bedtime, entry.wakeTime);
    const { data, error } = await supabase
      .from('sleep_entries')
      .upsert({
        user_id: entry.userId, sleep_date: entry.date,
        bedtime: entry.bedtime, wake_time: entry.wakeTime,
        duration_hours: duration, quality: entry.quality, notes: entry.notes,
      }, { onConflict: 'user_id,sleep_date' })
      .select().single();

    if (error || !data) {
      console.error('saveEntry:', error?.message);
      return { ...entry, id: crypto.randomUUID(), durationHours: duration };
    }
    return rowToEntry(data);
  },

  async deleteEntry(userId: string, id: string): Promise<void> {
    await supabase.from('sleep_entries').delete().eq('id', id).eq('user_id', userId);
  },

  async getAverageDuration(userId: string, days = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const entries = await sleepService.getEntries(userId);
    const recent = entries.filter(e => new Date(e.date) >= cutoff);
    if (recent.length === 0) return 0;
    return Math.round((recent.reduce((s, e) => s + e.durationHours, 0) / recent.length) * 10) / 10;
  },

  async getAverageQuality(userId: string, days = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const entries = await sleepService.getEntries(userId);
    const recent = entries.filter(e => new Date(e.date) >= cutoff);
    if (recent.length === 0) return 0;
    return Math.round((recent.reduce((s, e) => s + e.quality, 0) / recent.length) * 10) / 10;
  },
};
