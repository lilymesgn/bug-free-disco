// ============================================================
// Fit Tracker PRO — Meal Plan Service (Supabase)
// Manages weekly meal plan slots and derives the grocery list
// from whatever recipes are currently planned for the week.
// ============================================================
import { supabase } from './supabaseClient';
import { getRecipeById, type MealSlot, type RecipeIngredient } from './recipeData';

export interface PlannedMeal {
  id: string;
  userId: string;
  planDate: string;    // "YYYY-MM-DD"
  mealType: MealSlot;
  recipeId: string;
  recipeName: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged: boolean;
}

export interface GroceryItem {
  key: string;          // "name|unit" — stable identity for check-off state
  name: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
}

function rowToMeal(r: any): PlannedMeal {
  return {
    id: r.id, userId: r.user_id, planDate: r.plan_date, mealType: r.meal_type,
    recipeId: r.recipe_id, recipeName: r.recipe_name, servings: Number(r.servings),
    calories: r.calories, protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat),
    logged: r.logged,
  };
}

/** Returns the Monday of the week containing `date`, as "YYYY-MM-DD" */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function getWeekDates(weekStartIso: string): string[] {
  const start = new Date(weekStartIso + 'T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export const mealPlanService = {
  async getPlanForWeek(userId: string, weekStartIso: string): Promise<PlannedMeal[]> {
    const dates = getWeekDates(weekStartIso);
    const { data, error } = await supabase
      .from('meal_plan_items').select('*')
      .eq('user_id', userId)
      .gte('plan_date', dates[0]).lte('plan_date', dates[6])
      .order('plan_date', { ascending: true });
    if (error) { console.error('getPlanForWeek:', error.message); return []; }
    return (data || []).map(rowToMeal);
  },

  async getPlanForDate(userId: string, isoDate: string): Promise<PlannedMeal[]> {
    const { data, error } = await supabase
      .from('meal_plan_items').select('*')
      .eq('user_id', userId).eq('plan_date', isoDate)
      .order('created_at', { ascending: true });
    if (error) { console.error('getPlanForDate:', error.message); return []; }
    return (data || []).map(rowToMeal);
  },

  async addMeal(userId: string, planDate: string, mealType: MealSlot, recipeId: string, servings = 1): Promise<PlannedMeal | null> {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return null;

    const { data, error } = await supabase.from('meal_plan_items').insert({
      user_id: userId, plan_date: planDate, meal_type: mealType,
      recipe_id: recipe.id, recipe_name: recipe.name, servings,
      calories: Math.round(recipe.calories * servings),
      protein: Math.round(recipe.protein * servings * 10) / 10,
      carbs: Math.round(recipe.carbs * servings * 10) / 10,
      fat: Math.round(recipe.fat * servings * 10) / 10,
    }).select().single();

    if (error || !data) { console.error('addMeal:', error?.message); return null; }
    return rowToMeal(data);
  },

  async removeMeal(userId: string, mealId: string): Promise<void> {
    await supabase.from('meal_plan_items').delete().eq('id', mealId).eq('user_id', userId);
  },

  async markLogged(userId: string, mealId: string, logged: boolean): Promise<void> {
    await supabase.from('meal_plan_items').update({ logged }).eq('id', mealId).eq('user_id', userId);
  },

  /** Total planned meals for a user this week — used for the free-tier cap */
  async getWeeklyPlanCount(userId: string, weekStartIso: string): Promise<number> {
    const meals = await mealPlanService.getPlanForWeek(userId, weekStartIso);
    return meals.length;
  },

  // ── Grocery list ────────────────────────────────────────────────────────────
  /** Aggregates ingredients from every recipe planned in the given week */
  async buildGroceryList(userId: string, weekStartIso: string): Promise<GroceryItem[]> {
    const meals = await mealPlanService.getPlanForWeek(userId, weekStartIso);
    const checkedKeys = await mealPlanService.getCheckedKeys(userId, weekStartIso);

    const totals = new Map<string, GroceryItem>();

    for (const meal of meals) {
      const recipe = getRecipeById(meal.recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const scaledAmount = ing.amount * meal.servings;
        const key = `${ing.name.toLowerCase()}|${ing.unit}`;
        const existing = totals.get(key);
        if (existing) {
          existing.amount += scaledAmount;
        } else {
          totals.set(key, {
            key, name: ing.name, amount: scaledAmount, unit: ing.unit,
            category: ing.category, checked: checkedKeys.has(key),
          });
        }
      }
    }

    return Array.from(totals.values()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  },

  async getCheckedKeys(userId: string, weekStartIso: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('grocery_checked_items').select('item_key, checked')
      .eq('user_id', userId).eq('week_start', weekStartIso);
    if (error) return new Set();
    return new Set((data || []).filter((r: any) => r.checked).map((r: any) => r.item_key));
  },

  async toggleChecked(userId: string, weekStartIso: string, itemKey: string, checked: boolean): Promise<void> {
    const { error } = await supabase
      .from('grocery_checked_items')
      .upsert({ user_id: userId, week_start: weekStartIso, item_key: itemKey, checked }, { onConflict: 'user_id,week_start,item_key' });
    if (error) console.error('toggleChecked:', error.message);
  },
};
