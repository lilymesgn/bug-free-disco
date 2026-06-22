// ============================================================
// Fit Tracker PRO — AI Context Service
//
// Two things live here:
//
// 1. calculateNutritionGoals() — personalized daily calorie and
//    macro targets using the Mifflin-St Jeor equation, adjusted
//    for the user's stated fitness goal. Falls back to general
//    defaults if the user hasn't entered their weight/height in
//    Profile yet.
//
// 2. buildUserContext() — a compact text snapshot of the user's
//    real fitness data (today's nutrition, streak, weekly
//    progress, last workout) for injection into the AI Coach's
//    system prompt, so its responses are personalized instead
//    of generic.
// ============================================================
import type { User } from '../types';
import { workoutService } from './workoutService';
import { sessionService } from './progressService';
import { habitService } from './habitService';
import { sleepService } from './sleepService';
import { calorieService } from './calorieService';

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// General-purpose defaults used until the user sets weight/height in Profile
const FALLBACK_GOALS: NutritionGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

// Date of birth isn't collected at signup, so the BMR estimate assumes
// this age. The calorie target is still meaningfully personalized via
// weight, height, gender, and goal — this is just one input among several.
const ASSUMED_AGE = 30;

/**
 * Personalized daily nutrition targets via Mifflin-St Jeor BMR ×
 * activity factor, shifted for the user's goal:
 *  - lose_weight: ~500 kcal deficit, higher protein to preserve muscle
 *  - build_muscle: ~300 kcal surplus, higher protein for growth
 *  - improve_endurance: maintenance calories, moderate protein
 *  - get_fit (default): maintenance calories
 *
 * Returns FALLBACK_GOALS if the user hasn't set weight/height yet
 * (Profile page) — those fields are required for a real estimate.
 */
export function calculateNutritionGoals(user: User | null | undefined): NutritionGoals {
  if (!user?.weight || !user?.height) return { ...FALLBACK_GOALS };

  const bmr =
    user.gender === 'female'
      ? 10 * user.weight + 6.25 * user.height - 5 * ASSUMED_AGE - 161
      : 10 * user.weight + 6.25 * user.height - 5 * ASSUMED_AGE + 5;

  const tdee = bmr * 1.55; // moderate activity assumption (trains regularly)

  let calories = tdee;
  let proteinPerKg = 1.8;

  switch (user.goal) {
    case 'lose_weight':
      calories = tdee - 500;
      proteinPerKg = 2.0;
      break;
    case 'build_muscle':
      calories = tdee + 300;
      proteinPerKg = 2.2;
      break;
    case 'improve_endurance':
      proteinPerKg = 1.6;
      break;
    default:
      // 'get_fit' → maintenance calories
      break;
  }

  calories = Math.max(1200, Math.round(calories / 10) * 10);
  const protein = Math.round(user.weight * proteinPerKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  get_fit: 'Get fit / general health',
  improve_endurance: 'Improve endurance',
};

/**
 * Builds a compact, line-based summary of the user's current
 * fitness data for the AI Coach's system prompt. Reads from
 * Supabase so it always reflects the user's real, current data.
 */
export async function buildUserContext(user: User): Promise<string> {
  const [legacyWorkouts, sessions, stats] = await Promise.all([
    workoutService.getWorkouts(user.id),
    sessionService.getSessions(user.id),
    workoutService.getStats(user.id),
  ]);
  const habits = habitService.getHabitStats(user.id, legacyWorkouts, sessions, 4);
  const goals = calculateNutritionGoals(user);

  const todayIso = calorieService.dateKey(0);
  const [foodEntries, waterCups, avgSleep, avgSleepQuality] = await Promise.all([
    calorieService.getEntriesForDate(user.id, todayIso),
    calorieService.getWaterCups(user.id, todayIso),
    sleepService.getAverageDuration(user.id, 7),
    sleepService.getAverageQuality(user.id, 7),
  ]);
  const todayCalories = foodEntries.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProtein = Math.round(foodEntries.reduce((s, e) => s + (e.protein || 0), 0));

  const lastSession = sessions
    .slice()
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

  const lines: string[] = [];
  lines.push('--- CURRENT USER DATA (use this to personalize your response; do not repeat it back verbatim) ---');
  lines.push(`Name: ${user.name}`);
  lines.push(`Goal: ${GOAL_LABELS[user.goal] || user.goal}`);
  if (user.weight && user.height) {
    lines.push(`Profile: ${user.weight}kg, ${user.height}cm`);
  } else {
    lines.push(`Profile: weight/height not set — nutrition targets below are general defaults, not personalized`);
  }
  lines.push(`Daily targets: ${goals.calories} kcal, ${goals.protein}g protein, ${goals.carbs}g carbs, ${goals.fat}g fat`);
  lines.push(
    `Today so far: ${todayCalories} kcal eaten (${Math.max(0, goals.calories - todayCalories)} kcal remaining), ` +
      `${todayProtein}g protein, ${waterCups}/8 cups water`
  );
  lines.push(`Workout streak: ${stats.streak} day${stats.streak === 1 ? '' : 's'}`);
  lines.push(`This week: ${habits.weeklyWorkouts}/${habits.weeklyGoal} workouts completed`);
  lines.push(`Total workouts logged (all time): ${stats.totalWorkouts}`);

  if (lastSession) {
    const daysAgo = Math.floor((Date.now() - new Date(lastSession.startTime).getTime()) / 86_400_000);
    const when = daysAgo <= 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
    lines.push(`Last workout: "${lastSession.planName}" (${lastSession.category}) — ${when}`);
  } else {
    lines.push('Last workout: none logged yet');
  }

  if (avgSleep > 0) {
    lines.push(`7-day avg sleep: ${avgSleep}h/night, quality ${avgSleepQuality.toFixed(1)}/5${avgSleep < 7 ? ' (below recommended — may affect recovery)' : ''}`);
  } else {
    lines.push('Sleep tracking: no data logged yet');
  }

  lines.push('--- END USER DATA ---');
  return lines.join('\n');
}
