// ============================================================
// Fit Tracker PRO — Calorie & Water Tracking Service (Supabase)
// Food entries are scoped to a calendar date (logged_date) so
// "today's entries" and history both query the same table.
// ============================================================
import { supabase } from './supabaseClient';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  mealType: MealType;
  time: string; // "HH:MM" display string
}

function rowToEntry(r: any): FoodEntry {
  return {
    id: r.id, name: r.name, calories: r.calories,
    protein: Number(r.protein) || 0, carbs: Number(r.carbs) || 0, fat: Number(r.fat) || 0,
    fiber: r.fiber ? Number(r.fiber) : undefined,
    sodium: r.sodium ? Number(r.sodium) : undefined,
    mealType: r.meal_type, time: r.logged_time || '',
  };
}

function dateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

export const calorieService = {
  dateKey,

  async getEntriesForDate(userId: string, isoDate: string): Promise<FoodEntry[]> {
    const { data, error } = await supabase
      .from('food_entries').select('*')
      .eq('user_id', userId).eq('logged_date', isoDate)
      .order('created_at', { ascending: true });
    if (error) { console.error('getEntriesForDate:', error.message); return []; }
    return (data || []).map(rowToEntry);
  },

  /** Efficient single-query fetch for a date range (used by weekly summaries) */
  async getEntriesInRange(userId: string, startIso: string, endIso: string): Promise<Array<FoodEntry & { date: string }>> {
    const { data, error } = await supabase
      .from('food_entries').select('*')
      .eq('user_id', userId)
      .gte('logged_date', startIso).lte('logged_date', endIso)
      .order('logged_date', { ascending: false });
    if (error) { console.error('getEntriesInRange:', error.message); return []; }
    return (data || []).map((r: any) => ({ ...rowToEntry(r), date: r.logged_date }));
  },

  async addEntry(userId: string, isoDate: string, entry: Omit<FoodEntry, 'id' | 'time'>): Promise<FoodEntry | null> {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const { data, error } = await supabase.from('food_entries').insert({
      user_id: userId, logged_date: isoDate, logged_time: time,
      name: entry.name, calories: entry.calories,
      protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
      fiber: entry.fiber, sodium: entry.sodium, meal_type: entry.mealType,
    }).select().single();

    if (error || !data) { console.error('addEntry:', error?.message); return null; }
    return rowToEntry(data);
  },

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    await supabase.from('food_entries').delete().eq('id', entryId).eq('user_id', userId);
  },

  // ── Water ──────────────────────────────────────────────────────────────────
  async getWaterCups(userId: string, isoDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('water_logs').select('cups')
      .eq('user_id', userId).eq('logged_date', isoDate)
      .maybeSingle();
    if (error || !data) return 0;
    return data.cups;
  },

  async setWaterCups(userId: string, isoDate: string, cups: number): Promise<void> {
    const { error } = await supabase
      .from('water_logs')
      .upsert({ user_id: userId, logged_date: isoDate, cups }, { onConflict: 'user_id,logged_date' });
    if (error) console.error('setWaterCups:', error.message);
  },

  // ── Recent foods (quick-add suggestions) ─────────────────────────────────────
  async saveRecentFood(userId: string, food: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number }): Promise<void> {
    const { error } = await supabase
      .from('recent_foods')
      .upsert({
        user_id: userId, name: food.name, calories: food.calories,
        protein: food.protein, carbs: food.carbs, fat: food.fat,
        fiber: food.fiber || 0, last_used: new Date().toISOString(),
      }, { onConflict: 'user_id,name' });
    if (error) console.error('saveRecentFood:', error.message);
  },

  async getRecentFoods(userId: string, limit = 6): Promise<Array<{ name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number }>> {
    const { data, error } = await supabase
      .from('recent_foods').select('*').eq('user_id', userId)
      .order('last_used', { ascending: false }).limit(limit);
    if (error) return [];
    return (data || []).map((r: any) => ({
      name: r.name, calories: r.calories,
      protein: Number(r.protein) || 0, carbs: Number(r.carbs) || 0, fat: Number(r.fat) || 0,
      fiber: r.fiber ? Number(r.fiber) : undefined,
    }));
  },
};
