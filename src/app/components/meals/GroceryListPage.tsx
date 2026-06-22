// ============================================================
// Fit Tracker PRO — Grocery List Page (Premium)
// Auto-generated from the current week's meal plan, grouped
// by aisle category with persisted check-off state.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  ShoppingCart, Check, ChevronLeft, ChevronRight, Crown,
  Apple, Beef, Milk, Wheat, Package, Snowflake, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import {
  mealPlanService, getWeekStart, type GroceryItem,
} from '../../services/mealPlanService';
import type { IngredientCategory } from '../../services/recipeData';

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: 'Produce', protein: 'Protein', dairy: 'Dairy',
  grains: 'Grains & Bread', pantry: 'Pantry', frozen: 'Frozen', other: 'Other',
};

const CATEGORY_ICONS: Record<IngredientCategory, React.ElementType> = {
  produce: Apple, protein: Beef, dairy: Milk,
  grains: Wheat, pantry: Package, frozen: Snowflake, other: MoreHorizontal,
};

const CATEGORY_ORDER: IngredientCategory[] = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'frozen', 'other'];

function formatWeekRange(weekStartIso: string): string {
  const start = new Date(weekStartIso + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatAmount(amount: number): string {
  return String(Math.round(amount * 10) / 10);
}

export default function GroceryListPage() {
  const { user } = useAuth();
  const { canAccess } = useFreemium();

  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasAccess = canAccess('grocery_list');

  useEffect(() => {
    if (!user || !hasAccess) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    mealPlanService.buildGroceryList(user.id, weekStart).then(list => {
      if (!cancelled) { setItems(list); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [user, weekStart, hasAccess]);

  const grouped = useMemo(() => {
    const map = new Map<IngredientCategory, GroceryItem[]>();
    for (const item of items) {
      const cat = (item.category as IngredientCategory) || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [items]);

  const checkedCount = items.filter(i => i.checked).length;

  const handleToggle = async (item: GroceryItem) => {
    if (!user) return;
    const nextChecked = !item.checked;
    setItems(prev => prev.map(i => i.key === item.key ? { ...i, checked: nextChecked } : i)); // optimistic
    await mealPlanService.toggleChecked(user.id, weekStart, item.key, nextChecked);
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

  // ── Premium gate ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-white text-xl font-bold">Grocery List</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xs">
            Automatically build a shopping list from your weekly meal plan, grouped by aisle and ready to check off in-store.
          </p>
        </div>
        <Link
          to="/subscription"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl transition-colors"
        >
          <Crown className="w-4 h-4" />
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          <ShoppingCart className="w-5 h-5 text-green-400" /> Grocery List
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">
          {items.length > 0 ? `${checkedCount}/${items.length} items checked` : 'Generated from your meal plan'}
        </p>
      </motion.div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl p-3">
        <button onClick={goToPrevWeek} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-white text-sm" style={{ fontWeight: 600 }}>{formatWeekRange(weekStart)}</span>
        <button onClick={goToNextWeek} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(checkedCount / items.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nothing planned this week</p>
          <p className="text-gray-600 text-xs mt-1">Add meals to your plan and they'll show up here</p>
          <Link
            to="/meal-plan"
            className="inline-flex items-center gap-2 mt-4 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Go to Meal Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => {
            const CatIcon = CATEGORY_ICONS[cat];
            const catItems = grouped.get(cat)!;
            return (
              <div key={cat} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className="w-4 h-4 text-green-400" />
                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>{CATEGORY_LABELS[cat]}</p>
                  <span className="text-gray-600 text-xs ml-auto">{catItems.length}</span>
                </div>
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {catItems.map(item => (
                      <motion.button
                        key={item.key}
                        onClick={() => handleToggle(item)}
                        className="w-full flex items-center gap-3 py-2 px-1 text-left"
                        initial={false}
                        animate={{ opacity: item.checked ? 0.5 : 1 }}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          item.checked ? 'bg-green-500 border-green-500' : 'border-gray-600'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm flex-1 ${item.checked ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                          {item.name}
                        </span>
                        <span className="text-gray-500 text-xs flex-shrink-0">
                          {formatAmount(item.amount)} {item.unit}
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
