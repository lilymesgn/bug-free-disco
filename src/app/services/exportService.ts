// ============================================================
// Fit Tracker PRO — Data Export Service
// Export workouts + nutrition to CSV.
// ============================================================
import type { Workout, WorkoutSession } from '../types';
import { supabase } from './supabaseClient';

function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const head = headers.map(escapeCSV).join(',');
  const body = rows.map(r => r.map(escapeCSV).join(',')).join('\n');
  return `${head}\n${body}`;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportService = {
  exportWorkouts(workouts: Workout[], sessions: WorkoutSession[]) {
    const headers = ['Date', 'Name', 'Category', 'Duration (min)', 'Calories', 'Notes'];
    const rows: unknown[][] = [
      ...workouts.map(w => [w.date, w.name, w.category || 'strength', w.duration, w.calories, w.notes || '']),
      ...sessions.map(s => [
        s.startTime.split('T')[0], s.planName, s.category, s.duration, s.totalCalories, s.notes || '',
      ]),
    ].sort((a, b) => String(b[0]).localeCompare(String(a[0])));

    downloadCSV(toCSV(headers, rows), `fit_tracker_workouts_${new Date().toISOString().split('T')[0]}.csv`);
  },

  async exportNutrition(userId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { data, error } = await supabase
      .from('food_entries')
      .select('logged_date, meal_type, name, calories, protein, carbs, fat')
      .eq('user_id', userId)
      .gte('logged_date', cutoff.toISOString().split('T')[0])
      .order('logged_date', { ascending: false });

    if (error) {
      console.error('exportNutrition:', error.message);
      alert('Could not export nutrition data. Please try again.');
      return;
    }

    if (!data || data.length === 0) {
      alert('No nutrition data to export yet. Start logging meals first!');
      return;
    }

    const headers = ['Date', 'Meal', 'Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
    const rows = data.map(e => [e.logged_date, e.meal_type, e.name, e.calories, e.protein, e.carbs, e.fat]);

    downloadCSV(toCSV(headers, rows), `fit_tracker_nutrition_${new Date().toISOString().split('T')[0]}.csv`);
  },
};
