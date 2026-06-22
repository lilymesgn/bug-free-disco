// ============================================================
// Fit Tracker PRO — Recipe Database
// Curated recipe catalog, same pattern as the exercise and
// common-foods databases: shipped as app content rather than
// a database table, since it's shared reference data rather
// than per-user data. When a user adds a recipe to their plan,
// a snapshot of its macros is stored with the plan entry so
// later edits here don't retroactively change past plans.
// ============================================================

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type IngredientCategory = 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'other';

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string; // 'g', 'cup', 'tbsp', 'tsp', 'piece', 'oz', 'ml', 'clove', 'slice'
  category: IngredientCategory;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealSlot;
  tags: string[]; // 'high-protein', 'quick', 'vegetarian', 'low-carb', 'budget'
  prepMinutes: number;
  servings: number;
  calories: number;  // per serving
  protein: number;   // per serving, g
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: RecipeIngredient[]; // for `servings` servings
  instructions: string[];
}

export const RECIPE_DB: Recipe[] = [
  // ─── Breakfast ────────────────────────────────────────────────────────────
  {
    id: 'protein-oatmeal-bowl', name: 'Protein Oatmeal Bowl', mealType: 'breakfast',
    tags: ['high-protein', 'quick', 'vegetarian'], prepMinutes: 8, servings: 1,
    calories: 410, protein: 28, carbs: 52, fat: 10, fiber: 7,
    ingredients: [
      { name: 'Rolled oats', amount: 60, unit: 'g', category: 'grains' },
      { name: 'Whey protein powder', amount: 1, unit: 'scoop', category: 'pantry' },
      { name: 'Milk', amount: 200, unit: 'ml', category: 'dairy' },
      { name: 'Banana', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Peanut butter', amount: 1, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Cook oats with milk over medium heat for 5 minutes, stirring occasionally.',
      'Remove from heat and stir in protein powder until smooth.',
      'Top with sliced banana and a drizzle of peanut butter.',
    ],
  },
  {
    id: 'veggie-egg-scramble', name: 'Veggie Egg Scramble', mealType: 'breakfast',
    tags: ['high-protein', 'low-carb', 'quick'], prepMinutes: 10, servings: 1,
    calories: 320, protein: 24, carbs: 8, fat: 21, fiber: 2,
    ingredients: [
      { name: 'Whole eggs', amount: 3, unit: 'piece', category: 'protein' },
      { name: 'Spinach', amount: 30, unit: 'g', category: 'produce' },
      { name: 'Bell pepper', amount: 0.5, unit: 'piece', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tsp', category: 'pantry' },
      { name: 'Feta cheese', amount: 20, unit: 'g', category: 'dairy' },
    ],
    instructions: [
      'Heat olive oil in a pan over medium heat. Sauté bell pepper for 2 minutes.',
      'Add spinach and cook until wilted.',
      'Whisk eggs and pour into the pan. Scramble until just set.',
      'Crumble feta on top and serve.',
    ],
  },
  {
    id: 'greek-yogurt-parfait', name: 'Greek Yogurt Parfait', mealType: 'breakfast',
    tags: ['high-protein', 'quick', 'vegetarian'], prepMinutes: 5, servings: 1,
    calories: 290, protein: 22, carbs: 38, fat: 6, fiber: 4,
    ingredients: [
      { name: 'Greek yogurt (plain)', amount: 200, unit: 'g', category: 'dairy' },
      { name: 'Mixed berries', amount: 100, unit: 'g', category: 'produce' },
      { name: 'Granola', amount: 30, unit: 'g', category: 'pantry' },
      { name: 'Honey', amount: 1, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Layer half the yogurt in a glass or bowl.',
      'Add half the berries and granola.',
      'Repeat layers and finish with a drizzle of honey.',
    ],
  },
  {
    id: 'avocado-toast-egg', name: 'Avocado Toast with Egg', mealType: 'breakfast',
    tags: ['vegetarian', 'quick'], prepMinutes: 10, servings: 1,
    calories: 380, protein: 17, carbs: 32, fat: 22, fiber: 8,
    ingredients: [
      { name: 'Whole grain bread', amount: 2, unit: 'slice', category: 'grains' },
      { name: 'Avocado', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Whole eggs', amount: 1, unit: 'piece', category: 'protein' },
      { name: 'Lemon juice', amount: 1, unit: 'tsp', category: 'pantry' },
      { name: 'Chili flakes', amount: 1, unit: 'pinch', category: 'pantry' },
    ],
    instructions: [
      'Toast the bread until golden.',
      'Mash avocado with lemon juice, salt, and pepper. Spread on toast.',
      'Fry or poach the egg and place on top.',
      'Finish with a pinch of chili flakes.',
    ],
  },
  {
    id: 'protein-pancakes', name: 'Protein Pancakes', mealType: 'breakfast',
    tags: ['high-protein', 'vegetarian'], prepMinutes: 15, servings: 2,
    calories: 340, protein: 26, carbs: 36, fat: 9, fiber: 4,
    ingredients: [
      { name: 'Rolled oats', amount: 80, unit: 'g', category: 'grains' },
      { name: 'Whey protein powder', amount: 1, unit: 'scoop', category: 'pantry' },
      { name: 'Whole eggs', amount: 2, unit: 'piece', category: 'protein' },
      { name: 'Banana', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Baking powder', amount: 1, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Blend oats, protein powder, eggs, banana, and baking powder until smooth.',
      'Heat a non-stick pan over medium-low heat.',
      'Pour small rounds of batter and cook 2 minutes per side until golden.',
    ],
  },
  {
    id: 'overnight-oats', name: 'Overnight Oats', mealType: 'breakfast',
    tags: ['vegetarian', 'budget', 'quick'], prepMinutes: 5, servings: 1,
    calories: 350, protein: 16, carbs: 54, fat: 9, fiber: 8,
    ingredients: [
      { name: 'Rolled oats', amount: 60, unit: 'g', category: 'grains' },
      { name: 'Milk', amount: 150, unit: 'ml', category: 'dairy' },
      { name: 'Greek yogurt (plain)', amount: 80, unit: 'g', category: 'dairy' },
      { name: 'Chia seeds', amount: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'Mixed berries', amount: 50, unit: 'g', category: 'produce' },
    ],
    instructions: [
      'Combine oats, milk, yogurt, and chia seeds in a jar.',
      'Stir well, cover, and refrigerate overnight.',
      'Top with berries before eating.',
    ],
  },

  // ─── Lunch ────────────────────────────────────────────────────────────────
  {
    id: 'grilled-chicken-salad', name: 'Grilled Chicken Salad', mealType: 'lunch',
    tags: ['high-protein', 'low-carb'], prepMinutes: 20, servings: 1,
    calories: 420, protein: 42, carbs: 18, fat: 19, fiber: 6,
    ingredients: [
      { name: 'Chicken breast', amount: 150, unit: 'g', category: 'protein' },
      { name: 'Mixed greens', amount: 80, unit: 'g', category: 'produce' },
      { name: 'Cherry tomatoes', amount: 80, unit: 'g', category: 'produce' },
      { name: 'Cucumber', amount: 0.5, unit: 'piece', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'Feta cheese', amount: 20, unit: 'g', category: 'dairy' },
    ],
    instructions: [
      'Season chicken breast and grill or pan-sear 6–7 minutes per side until cooked through.',
      'Slice and let rest 3 minutes.',
      'Toss greens, tomatoes, and cucumber with olive oil.',
      'Top salad with sliced chicken and crumbled feta.',
    ],
  },
  {
    id: 'turkey-avocado-wrap', name: 'Turkey & Avocado Wrap', mealType: 'lunch',
    tags: ['quick', 'budget'], prepMinutes: 8, servings: 1,
    calories: 410, protein: 30, carbs: 38, fat: 16, fiber: 6,
    ingredients: [
      { name: 'Whole wheat tortilla', amount: 1, unit: 'piece', category: 'grains' },
      { name: 'Sliced turkey breast', amount: 100, unit: 'g', category: 'protein' },
      { name: 'Avocado', amount: 0.5, unit: 'piece', category: 'produce' },
      { name: 'Lettuce', amount: 20, unit: 'g', category: 'produce' },
      { name: 'Mustard', amount: 1, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Lay tortilla flat and spread mustard and mashed avocado.',
      'Layer turkey and lettuce on top.',
      'Roll tightly and slice in half.',
    ],
  },
  {
    id: 'quinoa-buddha-bowl', name: 'Quinoa Buddha Bowl', mealType: 'lunch',
    tags: ['vegetarian', 'high-protein'], prepMinutes: 25, servings: 2,
    calories: 460, protein: 18, carbs: 58, fat: 18, fiber: 11,
    ingredients: [
      { name: 'Quinoa', amount: 150, unit: 'g', category: 'grains' },
      { name: 'Chickpeas (canned)', amount: 240, unit: 'g', category: 'pantry' },
      { name: 'Sweet potato', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Kale', amount: 60, unit: 'g', category: 'produce' },
      { name: 'Tahini', amount: 2, unit: 'tbsp', category: 'pantry' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Cook quinoa according to package instructions.',
      'Roast cubed sweet potato at 200°C for 20 minutes.',
      'Drain and rinse chickpeas, toss with olive oil and roast alongside sweet potato for the last 10 minutes.',
      'Massage kale with a little olive oil to soften.',
      'Assemble bowl with quinoa, sweet potato, chickpeas, and kale. Drizzle with tahini.',
    ],
  },
  {
    id: 'tuna-salad-sandwich', name: 'Tuna Salad Sandwich', mealType: 'lunch',
    tags: ['high-protein', 'quick', 'budget'], prepMinutes: 10, servings: 1,
    calories: 380, protein: 32, carbs: 34, fat: 13, fiber: 5,
    ingredients: [
      { name: 'Canned tuna (in water)', amount: 120, unit: 'g', category: 'protein' },
      { name: 'Greek yogurt (plain)', amount: 2, unit: 'tbsp', category: 'dairy' },
      { name: 'Celery', amount: 1, unit: 'stalk', category: 'produce' },
      { name: 'Whole grain bread', amount: 2, unit: 'slice', category: 'grains' },
      { name: 'Lettuce', amount: 15, unit: 'g', category: 'produce' },
    ],
    instructions: [
      'Drain tuna and mix with Greek yogurt and diced celery.',
      'Season with salt and pepper.',
      'Toast bread if desired, layer lettuce and tuna mixture, and assemble sandwich.',
    ],
  },
  {
    id: 'mediterranean-chickpea-bowl', name: 'Mediterranean Chickpea Bowl', mealType: 'lunch',
    tags: ['vegetarian', 'budget'], prepMinutes: 15, servings: 1,
    calories: 430, protein: 16, carbs: 50, fat: 18, fiber: 13,
    ingredients: [
      { name: 'Chickpeas (canned)', amount: 200, unit: 'g', category: 'pantry' },
      { name: 'Cucumber', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Cherry tomatoes', amount: 100, unit: 'g', category: 'produce' },
      { name: 'Red onion', amount: 0.25, unit: 'piece', category: 'produce' },
      { name: 'Feta cheese', amount: 30, unit: 'g', category: 'dairy' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Drain and rinse chickpeas.',
      'Dice cucumber, tomatoes, and red onion.',
      'Combine all vegetables with chickpeas in a bowl.',
      'Top with crumbled feta and a drizzle of olive oil.',
    ],
  },
  {
    id: 'chicken-burrito-bowl', name: 'Chicken Burrito Bowl', mealType: 'lunch',
    tags: ['high-protein'], prepMinutes: 25, servings: 2,
    calories: 520, protein: 40, carbs: 52, fat: 16, fiber: 9,
    ingredients: [
      { name: 'Chicken breast', amount: 250, unit: 'g', category: 'protein' },
      { name: 'Brown rice', amount: 150, unit: 'g', category: 'grains' },
      { name: 'Black beans (canned)', amount: 200, unit: 'g', category: 'pantry' },
      { name: 'Bell pepper', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Corn', amount: 100, unit: 'g', category: 'frozen' },
      { name: 'Lime', amount: 1, unit: 'piece', category: 'produce' },
    ],
    instructions: [
      'Cook brown rice according to package instructions.',
      'Season and grill chicken breast, then slice.',
      'Sauté bell pepper until just softened.',
      'Warm black beans and corn.',
      'Assemble bowl with rice, chicken, beans, corn, and pepper. Squeeze lime on top.',
    ],
  },

  // ─── Dinner ───────────────────────────────────────────────────────────────
  {
    id: 'baked-salmon-asparagus', name: 'Baked Salmon with Asparagus', mealType: 'dinner',
    tags: ['high-protein', 'low-carb'], prepMinutes: 25, servings: 1,
    calories: 460, protein: 38, carbs: 10, fat: 28, fiber: 4,
    ingredients: [
      { name: 'Salmon fillet', amount: 180, unit: 'g', category: 'protein' },
      { name: 'Asparagus', amount: 150, unit: 'g', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'Lemon', amount: 0.5, unit: 'piece', category: 'produce' },
      { name: 'Garlic', amount: 2, unit: 'clove', category: 'produce' },
    ],
    instructions: [
      'Preheat oven to 200°C.',
      'Place salmon and asparagus on a baking tray, drizzle with olive oil, minced garlic, salt, and pepper.',
      'Bake 12–15 minutes until salmon flakes easily.',
      'Squeeze fresh lemon over before serving.',
    ],
  },
  {
    id: 'lean-beef-stirfry', name: 'Lean Beef Stir-Fry', mealType: 'dinner',
    tags: ['high-protein'], prepMinutes: 20, servings: 2,
    calories: 480, protein: 38, carbs: 36, fat: 19, fiber: 5,
    ingredients: [
      { name: 'Lean beef strips', amount: 300, unit: 'g', category: 'protein' },
      { name: 'Broccoli', amount: 200, unit: 'g', category: 'produce' },
      { name: 'Bell pepper', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Brown rice', amount: 150, unit: 'g', category: 'grains' },
      { name: 'Soy sauce', amount: 2, unit: 'tbsp', category: 'pantry' },
      { name: 'Garlic', amount: 2, unit: 'clove', category: 'produce' },
    ],
    instructions: [
      'Cook brown rice according to package instructions.',
      'Sear beef strips in a hot pan or wok for 2–3 minutes, then remove.',
      'Stir-fry broccoli, bell pepper, and garlic for 4–5 minutes.',
      'Return beef to the pan, add soy sauce, and toss together for 1 minute.',
      'Serve over brown rice.',
    ],
  },
  {
    id: 'grilled-chicken-sweet-potato', name: 'Grilled Chicken with Sweet Potato', mealType: 'dinner',
    tags: ['high-protein', 'budget'], prepMinutes: 30, servings: 1,
    calories: 450, protein: 40, carbs: 40, fat: 13, fiber: 6,
    ingredients: [
      { name: 'Chicken breast', amount: 180, unit: 'g', category: 'protein' },
      { name: 'Sweet potato', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Broccoli', amount: 100, unit: 'g', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'Paprika', amount: 1, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Preheat oven to 200°C. Cube sweet potato, toss with oil and paprika, roast 25 minutes.',
      'Season chicken and grill or pan-sear 6–7 minutes per side.',
      'Steam broccoli for 5 minutes.',
      'Plate chicken with sweet potato and broccoli.',
    ],
  },
  {
    id: 'shrimp-broccoli-stirfry', name: 'Shrimp & Broccoli Stir-Fry', mealType: 'dinner',
    tags: ['high-protein', 'low-carb', 'quick'], prepMinutes: 15, servings: 1,
    calories: 320, protein: 34, carbs: 16, fat: 13, fiber: 5,
    ingredients: [
      { name: 'Shrimp (peeled)', amount: 200, unit: 'g', category: 'protein' },
      { name: 'Broccoli', amount: 150, unit: 'g', category: 'produce' },
      { name: 'Garlic', amount: 2, unit: 'clove', category: 'produce' },
      { name: 'Soy sauce', amount: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'Sesame oil', amount: 1, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Heat sesame oil in a pan over high heat.',
      'Stir-fry broccoli and garlic for 3 minutes.',
      'Add shrimp and cook 2–3 minutes until pink and opaque.',
      'Add soy sauce, toss, and serve immediately.',
    ],
  },
  {
    id: 'turkey-chili', name: 'Turkey Chili', mealType: 'dinner',
    tags: ['high-protein', 'budget'], prepMinutes: 35, servings: 4,
    calories: 360, protein: 32, carbs: 30, fat: 12, fiber: 10,
    ingredients: [
      { name: 'Ground turkey', amount: 500, unit: 'g', category: 'protein' },
      { name: 'Kidney beans (canned)', amount: 400, unit: 'g', category: 'pantry' },
      { name: 'Crushed tomatoes (canned)', amount: 400, unit: 'g', category: 'pantry' },
      { name: 'Onion', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Bell pepper', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Chili powder', amount: 2, unit: 'tsp', category: 'pantry' },
    ],
    instructions: [
      'Brown ground turkey in a large pot, breaking it up as it cooks.',
      'Add diced onion and bell pepper, cook 5 minutes.',
      'Stir in beans, crushed tomatoes, and chili powder.',
      'Simmer 20 minutes, stirring occasionally.',
    ],
  },
  {
    id: 'baked-cod-quinoa', name: 'Baked Cod with Quinoa', mealType: 'dinner',
    tags: ['high-protein', 'low-carb'], prepMinutes: 25, servings: 1,
    calories: 380, protein: 36, carbs: 32, fat: 10, fiber: 5,
    ingredients: [
      { name: 'Cod fillet', amount: 180, unit: 'g', category: 'protein' },
      { name: 'Quinoa', amount: 70, unit: 'g', category: 'grains' },
      { name: 'Zucchini', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Lemon', amount: 0.5, unit: 'piece', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Cook quinoa according to package instructions.',
      'Season cod with salt, pepper, and lemon. Bake at 200°C for 12–15 minutes.',
      'Sauté sliced zucchini in olive oil for 5 minutes.',
      'Serve cod over quinoa with zucchini on the side.',
    ],
  },
  {
    id: 'lentil-vegetable-curry', name: 'Lentil & Vegetable Curry', mealType: 'dinner',
    tags: ['vegetarian', 'budget', 'high-protein'], prepMinutes: 30, servings: 3,
    calories: 340, protein: 18, carbs: 48, fat: 9, fiber: 14,
    ingredients: [
      { name: 'Red lentils', amount: 200, unit: 'g', category: 'pantry' },
      { name: 'Coconut milk (light)', amount: 400, unit: 'ml', category: 'pantry' },
      { name: 'Onion', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Spinach', amount: 100, unit: 'g', category: 'produce' },
      { name: 'Curry powder', amount: 2, unit: 'tbsp', category: 'pantry' },
      { name: 'Garlic', amount: 2, unit: 'clove', category: 'produce' },
    ],
    instructions: [
      'Sauté diced onion and garlic until soft.',
      'Add curry powder and toast for 30 seconds.',
      'Stir in lentils and coconut milk. Simmer 20 minutes until lentils are tender.',
      'Stir in spinach until wilted, then serve.',
    ],
  },
  {
    id: 'lemon-herb-chicken-thighs', name: 'Lemon Herb Chicken Thighs', mealType: 'dinner',
    tags: ['high-protein', 'budget'], prepMinutes: 35, servings: 2,
    calories: 410, protein: 36, carbs: 14, fat: 24, fiber: 3,
    ingredients: [
      { name: 'Chicken thighs', amount: 400, unit: 'g', category: 'protein' },
      { name: 'Lemon', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Garlic', amount: 3, unit: 'clove', category: 'produce' },
      { name: 'Rosemary', amount: 1, unit: 'tsp', category: 'pantry' },
      { name: 'Green beans', amount: 200, unit: 'g', category: 'produce' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Marinate chicken thighs with lemon juice, minced garlic, rosemary, and olive oil for 15 minutes.',
      'Bake at 200°C for 25–30 minutes until cooked through.',
      'Steam green beans for 5 minutes.',
      'Serve chicken with green beans.',
    ],
  },

  // ─── Snacks ───────────────────────────────────────────────────────────────
  {
    id: 'protein-smoothie', name: 'Protein Smoothie', mealType: 'snack',
    tags: ['high-protein', 'quick', 'vegetarian'], prepMinutes: 5, servings: 1,
    calories: 240, protein: 26, carbs: 24, fat: 5, fiber: 4,
    ingredients: [
      { name: 'Whey protein powder', amount: 1, unit: 'scoop', category: 'pantry' },
      { name: 'Banana', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Milk', amount: 250, unit: 'ml', category: 'dairy' },
      { name: 'Ice cubes', amount: 5, unit: 'piece', category: 'other' },
    ],
    instructions: [
      'Add all ingredients to a blender.',
      'Blend until smooth, about 30–45 seconds.',
    ],
  },
  {
    id: 'cottage-cheese-berries', name: 'Cottage Cheese & Berries', mealType: 'snack',
    tags: ['high-protein', 'quick', 'vegetarian'], prepMinutes: 3, servings: 1,
    calories: 180, protein: 20, carbs: 14, fat: 4, fiber: 3,
    ingredients: [
      { name: 'Cottage cheese', amount: 150, unit: 'g', category: 'dairy' },
      { name: 'Mixed berries', amount: 80, unit: 'g', category: 'produce' },
    ],
    instructions: [
      'Spoon cottage cheese into a bowl.',
      'Top with mixed berries.',
    ],
  },
  {
    id: 'apple-almond-butter', name: 'Apple with Almond Butter', mealType: 'snack',
    tags: ['quick', 'vegetarian', 'budget'], prepMinutes: 2, servings: 1,
    calories: 220, protein: 6, carbs: 26, fat: 11, fiber: 6,
    ingredients: [
      { name: 'Apple', amount: 1, unit: 'piece', category: 'produce' },
      { name: 'Almond butter', amount: 1.5, unit: 'tbsp', category: 'pantry' },
    ],
    instructions: [
      'Slice the apple into wedges.',
      'Serve with almond butter for dipping.',
    ],
  },
  {
    id: 'eggs-and-nuts', name: 'Hard-Boiled Eggs & Nuts', mealType: 'snack',
    tags: ['high-protein', 'low-carb', 'quick'], prepMinutes: 12, servings: 1,
    calories: 260, protein: 16, carbs: 5, fat: 20, fiber: 2,
    ingredients: [
      { name: 'Whole eggs', amount: 2, unit: 'piece', category: 'protein' },
      { name: 'Mixed nuts', amount: 20, unit: 'g', category: 'pantry' },
    ],
    instructions: [
      'Boil eggs for 10 minutes, then cool in cold water and peel.',
      'Serve alongside a small handful of mixed nuts.',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getRecipeById(id: string): Recipe | undefined {
  return RECIPE_DB.find(r => r.id === id);
}

export function getRecipesByMealType(mealType: MealSlot): Recipe[] {
  return RECIPE_DB.filter(r => r.mealType === mealType);
}

export function searchRecipes(query: string, mealType?: MealSlot): Recipe[] {
  let pool = mealType ? getRecipesByMealType(mealType) : RECIPE_DB;
  if (!query.trim()) return pool;
  const q = query.toLowerCase();
  return pool.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Score recipes against remaining macros for a meal slot — used by
 * "Smart Suggestions" (Premium). Pure local scoring, no AI call:
 * fast, free, and deterministic. Lower score = better fit.
 */
export function suggestRecipesForRemaining(
  mealType: MealSlot,
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  limit = 3
): Recipe[] {
  const candidates = getRecipesByMealType(mealType).filter(r => r.calories <= remaining.calories + 150);
  if (candidates.length === 0) return getRecipesByMealType(mealType).slice(0, limit);

  const scored = candidates.map(r => {
    const calDiff = Math.abs(r.calories - remaining.calories) / Math.max(remaining.calories, 1);
    const proteinFit = remaining.protein > 0 ? Math.max(0, 1 - r.protein / remaining.protein) : 0;
    const score = calDiff * 0.6 + proteinFit * 0.4;
    return { recipe: r, score };
  });

  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map(s => s.recipe);
}
