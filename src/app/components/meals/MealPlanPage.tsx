// ============================================================
// Fit Tracker PRO — Meal Plan Page
// Weekly meal planner: assign recipes to breakfast/lunch/
// dinner/snack slots across 7 days, see projected macros vs
// goals, log a planned meal as eaten with one tap, and browse
// Smart Suggestions (Premium) based on remaining daily macros.
//
// Freemium: free users can plan up to WEEKLY_FREE_LIMIT meals
// per week total. Premium = unlimited + Smart Suggestions +
// Grocery List access.
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  ChevronLeft, ChevronRight, Plus, X, Search, Clock,
  Coffee, Sun, Moon, Apple, Check, Trash2, Lock, Crown,
  ShoppingCart, Sparkles, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { calculateNutritionGoals } from '../../services/aiContextService';
import { calorieService } from '../../services/calorieService';
import {
  mealPlanService, getWeekStart, getWeekDates, type PlannedMeal,
} from '../../services/mealPlanService';
import {
  searchRecipes, suggestRecipesForRemaining,
  type MealSlot, type Recipe,
} from '../../services/recipeData';

const WEEKLY_FREE_LIMIT = 5;

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_ICONS: Record<MealSlot, React.ElementType> = {
  breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Apple,
};
const SLOT_COLORS: Record<MealSlot, string> = {
  breakfast: 'text-orange-400', lunch: 'text-yellow-400',
  dinner: 'text-blue-400', snack: 'text-purple-400',
};

function formatDayLabel(iso: string): { weekday: string; day: string; isToday: boolean } {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date();
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d.getDate()),
    isToday: d.toDateString() === today.toDateString(),
  };
}

// ─── Recipe card (used in Add Meal modal) ──────────────────────────────────────
function RecipeCard({ recipe, onAdd }: { recipe: Recipe; onAdd: (servings: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [servings, setServings] = useState(1);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{recipe.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-0.5 text-gray-500 text-xs">
              <Clock className="w-3 h-3" /> {recipe.prepMinutes}m
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-orange-400 text-xs">{recipe.calories} cal</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 text-xs">{recipe.protein}g protein</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map(tag => (
                  <span key={tag} className="bg-gray-900 text-gray-400 text-xs px-2 py-0.5 rounded-lg capitalize">{tag}</span>
                ))}
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1.5" style={{ fontWeight: 600 }}>Ingredients (1 serving)</p>
                <ul className="space-y-0.5">
                  {recipe.ingredients.map(ing => (
                    <li key={ing.name} className="text-gray-400 text-xs">
                      {ing.amount} {ing.unit} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1.5" style={{ fontWeight: 600 }}>Instructions</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="text-gray-400 text-xs">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-2 py-1">
                    <button
                      onClick={() => setServings(s => Math.max(0.5, s - 0.5))}
                      className="text-gray-400 hover:text-white w-5 text-center"
                    >−</button>
                    <span className="text-white text-xs w-6 text-center">{servings}</span>
                    <button
                      onClick={() => setServings(s => s + 0.5)}
                      className="text-gray-400 hover:text-white w-5 text-center"
                    >+</button>
                  </div>
                </div>
                <button
                  onClick={() => onAdd(servings)}
                  className="bg-green-500 hover:bg-green-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Add to plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add Meal Modal ─────────────────────────────────────────────────────────────
function AddMealModal({
  mealType, isPremium, remaining, onAdd, onClose,
}: {
  mealType: MealSlot;
  isPremium: boolean;
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  onAdd: (recipeId: string, servings: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'browse' | 'suggested'>('browse');

  const filtered = useMemo(() => searchRecipes(search, mealType), [search, mealType]);
  const suggested = useMemo(
    () => isPremium ? suggestRecipesForRemaining(mealType, remaining, 4) : [],
    [isPremium, mealType, remaining]
  );

  const Icon = SLOT_ICONS[mealType];

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${SLOT_COLORS[mealType]}`} />
            <h3 className="text-white font-bold capitalize">Add {mealType}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-800 px-5 flex-shrink-0">
          {(['browse', 'suggested'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 mr-4 text-sm transition-colors border-b-2 flex items-center gap-1.5 ${
                tab === t ? 'text-green-400 border-green-500' : 'text-gray-500 border-transparent'
              }`}
              style={{ fontWeight: tab === t ? 600 : 400 }}
            >
              {t === 'browse' ? <Search className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t === 'browse' ? 'Browse' : 'Suggested'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'browse' ? (
            <>
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${mealType} recipes...`}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                />
              </div>
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-6">No recipes match your search</p>
                ) : (
                  filtered.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} onAdd={servings => onAdd(recipe.id, servings)} />
                  ))
                )}
              </div>
            </>
          ) : isPremium ? (
            <>
              <p className="text-gray-500 text-xs mb-3">
                Best matches for your remaining {remaining.calories} cal and {Math.round(remaining.protein)}g protein today
              </p>
              <div className="space-y-2">
                {suggested.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-6">No great matches left for today — try Browse instead</p>
                ) : (
                  suggested.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} onAdd={servings => onAdd(recipe.id, servings)} />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>Smart Suggestions</p>
              <p className="text-gray-500 text-xs mt-1 mb-4 max-w-xs mx-auto">
                Premium picks recipes that fit your remaining calories and protein for today, automatically.
              </p>
              <Link to="/subscription" className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MealPlanPage() {
  const { user } = useAuth();
  const { isPremium, canAccess } = useFreemium();

  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weekMeals, setWeekMeals] = useState<PlannedMeal[]>([]);
  const [todayConsumed, setTodayConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [showAddModal, setShowAddModal] = useState<MealSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const goals = calculateNutritionGoals(user);
  const todayIso = calorieService.dateKey(0);

  const loadWeek = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const meals = await mealPlanService.getPlanForWeek(user.id, weekStart);
    setWeekMeals(meals);
    setIsLoading(false);
  }, [user, weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  // Today's already-eaten macros, used to compute "remaining" for Smart Suggestions
  useEffect(() => {
    if (!user) return;
    calorieService.getEntriesForDate(user.id, todayIso).then(entries => {
      setTodayConsumed({
        calories: entries.reduce((s, e) => s + e.calories, 0),
        protein: entries.reduce((s, e) => s + e.protein, 0),
        carbs: entries.reduce((s, e) => s + e.carbs, 0),
        fat: entries.reduce((s, e) => s + e.fat, 0),
      });
    });
  }, [user, todayIso]);

  const dayMeals = useMemo(
    () => weekMeals.filter(m => m.planDate === selectedDate),
    [weekMeals, selectedDate]
  );

  const dayTotals = useMemo(() => dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories, protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [dayMeals]);

  const weeklyCount = weekMeals.length;
  const atFreeLimit = !isPremium && weeklyCount >= WEEKLY_FREE_LIMIT;

  const remainingToday = {
    calories: Math.max(0, goals.calories - todayConsumed.calories),
    protein: Math.max(0, goals.protein - todayConsumed.protein),
    carbs: Math.max(0, goals.carbs - todayConsumed.carbs),
    fat: Math.max(0, goals.fat - todayConsumed.fat),
  };

  const handleAddMeal = async (recipeId: string, servings: number) => {
    if (!user || !showAddModal || atFreeLimit) return;
    const saved = await mealPlanService.addMeal(user.id, selectedDate, showAddModal, recipeId, servings);
    if (saved) setWeekMeals(prev => [...prev, saved]);
    setShowAddModal(null);
  };

  const handleRemoveMeal = async (mealId: string) => {
    if (!user) return;
    setWeekMeals(prev => prev.filter(m => m.id !== mealId)); // optimistic
    await mealPlanService.removeMeal(user.id, mealId);
  };

  const handleLogAsEaten = async (meal: PlannedMeal) => {
    if (!user) return;
    await calorieService.addEntry(user.id, meal.planDate, {
      name: meal.recipeName, calories: meal.calories,
      protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
      mealType: meal.mealType,
    });
    await mealPlanService.markLogged(user.id, meal.id, true);
    setWeekMeals(prev => prev.map(m => m.id === meal.id ? { ...m, logged: true } : m));
  };

  const goToPrevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const goToNextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div className="flex items-center justify-between" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            <Coffee className="w-5 h-5 text-green-400" /> Meal Plan
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Plan your week, log meals in one tap</p>
        </div>
        <Link
          to="/grocery-list"
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-xl text-xs transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Grocery list
        </Link>
      </motion.div>

      {/* Free tier counter */}
      {!isPremium && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
          atFreeLimit ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
        }`}>
          <Lock className={`w-3.5 h-3.5 ${atFreeLimit ? 'text-red-400' : 'text-yellow-400'}`} />
          <span className={`text-xs ${atFreeLimit ? 'text-red-400' : 'text-yellow-400'}`}>
            {weeklyCount}/{WEEKLY_FREE_LIMIT} meals planned this week
          </span>
          {atFreeLimit && (
            <Link to="/subscription" className="ml-auto text-xs text-green-400 hover:text-green-300 transition-colors font-semibold">
              Upgrade
            </Link>
          )}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl p-3">
        <button onClick={goToPrevWeek} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex gap-1">
          {weekDates.map(date => {
            const { weekday, day, isToday } = formatDayLabel(date);
            const hasMeals = weekMeals.some(m => m.planDate === date);
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[38px] ${
                  isSelected ? 'bg-green-500 text-white' : isToday ? 'bg-gray-800 text-green-400' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span className="text-[10px] uppercase">{weekday}</span>
                <span className="text-sm" style={{ fontWeight: 700 }}>{day}</span>
                {hasMeals && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-400'}`} />}
              </button>
            );
          })}
        </div>
        <button onClick={goToNextWeek} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Day macro summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <p className="text-gray-500 text-xs mb-3" style={{ fontWeight: 600 }}>Planned for this day</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Cal', value: dayTotals.calories, goal: goals.calories, color: 'text-orange-400' },
            { label: 'Protein', value: Math.round(dayTotals.protein), goal: goals.protein, color: 'text-blue-400', unit: 'g' },
            { label: 'Carbs', value: Math.round(dayTotals.carbs), goal: goals.carbs, color: 'text-yellow-400', unit: 'g' },
            { label: 'Fat', value: Math.round(dayTotals.fat), goal: goals.fat, color: 'text-purple-400', unit: 'g' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-sm ${stat.color}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {stat.value}{stat.unit || ''}
              </p>
              <p className="text-gray-600 text-xs">{stat.label}</p>
              <p className="text-gray-700 text-xs">of {stat.goal}{stat.unit || ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meal slots for selected day */}
      {isLoading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {MEAL_SLOTS.map(slot => {
            const Icon = SLOT_ICONS[slot];
            const slotMeals = dayMeals.filter(m => m.mealType === slot);
            const isPastOrToday = new Date(selectedDate) <= new Date(new Date().toDateString());

            return (
              <div key={slot} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${SLOT_COLORS[slot]}`} />
                    <span className="text-white text-sm capitalize" style={{ fontWeight: 600 }}>{slot}</span>
                  </div>
                  <button
                    onClick={() => !atFreeLimit && setShowAddModal(slot)}
                    disabled={atFreeLimit}
                    className="flex items-center gap-1 text-green-400 hover:text-green-300 disabled:text-gray-600 disabled:cursor-not-allowed text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {slotMeals.length === 0 ? (
                  <p className="text-gray-600 text-xs">Nothing planned</p>
                ) : (
                  <div className="space-y-2">
                    {slotMeals.map(meal => (
                      <div key={meal.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{meal.recipeName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-orange-400 text-xs">{meal.calories} cal</span>
                            {meal.servings !== 1 && <span className="text-gray-500 text-xs">· {meal.servings}× servings</span>}
                          </div>
                        </div>
                        {meal.logged ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs flex-shrink-0">
                            <Check className="w-3.5 h-3.5" /> Logged
                          </span>
                        ) : isPastOrToday ? (
                          <button
                            onClick={() => handleLogAsEaten(meal)}
                            className="flex-shrink-0 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Log eaten
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add meal modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMealModal
            mealType={showAddModal}
            isPremium={canAccess('meal_suggestions')}
            remaining={remainingToday}
            onAdd={handleAddMeal}
            onClose={() => setShowAddModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
