import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servingSize: number;
  servingUnit: string;
  barcode: string | null;
}

export interface MealEntry {
  id: string;
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  loggedAt: Date;
}

export interface MacroSummary {
  userId: string;
  date: string;
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
}

export interface DailyIntake {
  userId: string;
  date: string;
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  waterIntake: number;
}

export interface MealPlan {
  id: string;
  userId: string;
  days: { day: string; meals: { type: string; name: string; calories: number }[] }[];
  createdAt: Date;
}

export interface Recipe {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
}

export interface NutritionGoals {
  id: string;
  userId: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  updatedAt: Date;
}

export const LogMealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foods: z
    .array(
      z.object({
        name: z.string().min(1),
        calories: z.number().nonnegative(),
        protein: z.number().nonnegative(),
        carbs: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        fiber: z.number().nonnegative().optional().default(0),
        servingSize: z.number().positive().optional().default(1),
        servingUnit: z.string().optional().default('serving'),
        barcode: z.string().nullable().optional().default(null),
        brand: z.string().nullable().optional().default(null),
      }),
    )
    .min(1),
});

export type LogMealInput = z.infer<typeof LogMealSchema>;

export const SetNutritionGoalsSchema = z.object({
  dailyCalories: z.number().positive(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
});

export type SetNutritionGoalsInput = z.infer<typeof SetNutritionGoalsSchema>;

const FOOD_DATABASE: FoodItem[] = [
  {
    id: 'food-1',
    name: 'Chicken Breast',
    brand: null,
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    servingSize: 100,
    servingUnit: 'g',
    barcode: '123456789',
  },
  {
    id: 'food-2',
    name: 'Brown Rice',
    brand: null,
    calories: 216,
    protein: 5,
    carbs: 45,
    fat: 1.8,
    fiber: 3.5,
    servingSize: 195,
    servingUnit: 'g',
    barcode: '987654321',
  },
  {
    id: 'food-3',
    name: 'Broccoli',
    brand: null,
    calories: 55,
    protein: 3.7,
    carbs: 11,
    fat: 0.6,
    fiber: 5.1,
    servingSize: 156,
    servingUnit: 'g',
    barcode: null,
  },
  {
    id: 'food-4',
    name: 'Greek Yogurt',
    brand: 'Fage',
    calories: 100,
    protein: 17,
    carbs: 6,
    fat: 0.7,
    fiber: 0,
    servingSize: 170,
    servingUnit: 'g',
    barcode: '111222333',
  },
  {
    id: 'food-5',
    name: 'Salmon',
    brand: null,
    calories: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
    fiber: 0,
    servingSize: 100,
    servingUnit: 'g',
    barcode: '444555666',
  },
];

export class NutritionService {
  private readonly meals = new Map<string, MealEntry>();
  private readonly goals = new Map<string, NutritionGoals>();

  logMeal(userId: string, meal: LogMealInput): MealEntry {
    const parsed = LogMealSchema.parse(meal);

    const foods: FoodItem[] = parsed.foods.map((f) => ({
      id: randomUUID(),
      name: f.name,
      brand: f.brand,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
      servingSize: f.servingSize,
      servingUnit: f.servingUnit,
      barcode: f.barcode,
    }));

    const entry: MealEntry = {
      id: randomUUID(),
      userId,
      mealType: parsed.mealType,
      foods,
      totalCalories: foods.reduce((sum, f) => sum + f.calories, 0),
      totalProtein: foods.reduce((sum, f) => sum + f.protein, 0),
      totalCarbs: foods.reduce((sum, f) => sum + f.carbs, 0),
      totalFat: foods.reduce((sum, f) => sum + f.fat, 0),
      loggedAt: new Date(),
    };

    this.meals.set(entry.id, entry);
    return entry;
  }

  searchFood(query: string): FoodItem[] {
    if (!query || query.trim().length === 0) {
      throw createAppError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const lowerQuery = query.toLowerCase();
    return FOOD_DATABASE.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        (f.brand && f.brand.toLowerCase().includes(lowerQuery)),
    );
  }

  getMacros(userId: string, date: string): MacroSummary {
    const userGoals = this.goals.get(userId);
    const dayMeals = this.getMealsForDate(userId, date);

    const consumed = {
      calories: dayMeals.reduce((sum, m) => sum + m.totalCalories, 0),
      protein: dayMeals.reduce((sum, m) => sum + m.totalProtein, 0),
      carbs: dayMeals.reduce((sum, m) => sum + m.totalCarbs, 0),
      fat: dayMeals.reduce((sum, m) => sum + m.totalFat, 0),
    };

    return {
      userId,
      date,
      calories: { consumed: consumed.calories, goal: userGoals?.dailyCalories ?? 2000 },
      protein: { consumed: consumed.protein, goal: userGoals?.proteinGrams ?? 150 },
      carbs: { consumed: consumed.carbs, goal: userGoals?.carbsGrams ?? 250 },
      fat: { consumed: consumed.fat, goal: userGoals?.fatGrams ?? 65 },
    };
  }

  getDailyIntake(userId: string, date: string): DailyIntake {
    const dayMeals = this.getMealsForDate(userId, date);

    return {
      userId,
      date,
      meals: dayMeals,
      totalCalories: dayMeals.reduce((sum, m) => sum + m.totalCalories, 0),
      totalProtein: dayMeals.reduce((sum, m) => sum + m.totalProtein, 0),
      totalCarbs: dayMeals.reduce((sum, m) => sum + m.totalCarbs, 0),
      totalFat: dayMeals.reduce((sum, m) => sum + m.totalFat, 0),
      waterIntake: 0,
    };
  }

  createMealPlan(userId: string, _preferences: Record<string, unknown>): MealPlan {
    return {
      id: randomUUID(),
      userId,
      days: [
        {
          day: 'Monday',
          meals: [
            { type: 'breakfast', name: 'Greek yogurt with berries', calories: 250 },
            { type: 'lunch', name: 'Grilled chicken salad', calories: 450 },
            { type: 'dinner', name: 'Salmon with brown rice', calories: 550 },
            { type: 'snack', name: 'Mixed nuts', calories: 200 },
          ],
        },
        {
          day: 'Tuesday',
          meals: [
            { type: 'breakfast', name: 'Oatmeal with banana', calories: 300 },
            { type: 'lunch', name: 'Turkey wrap', calories: 400 },
            { type: 'dinner', name: 'Chicken stir-fry', calories: 500 },
            { type: 'snack', name: 'Apple with peanut butter', calories: 250 },
          ],
        },
      ],
      createdAt: new Date(),
    };
  }

  getRecipeSuggestions(userId: string, _macroGoals: Record<string, unknown>): Recipe[] {
    void userId;
    return [
      {
        id: randomUUID(),
        name: 'Grilled Chicken with Quinoa',
        calories: 450,
        protein: 40,
        carbs: 35,
        fat: 12,
        ingredients: ['chicken breast', 'quinoa', 'olive oil', 'lemon', 'garlic'],
        instructions: [
          'Season chicken',
          'Grill for 6 minutes each side',
          'Cook quinoa',
          'Serve together',
        ],
        prepTime: 10,
        cookTime: 20,
      },
      {
        id: randomUUID(),
        name: 'Salmon Bowl',
        calories: 520,
        protein: 35,
        carbs: 45,
        fat: 18,
        ingredients: ['salmon fillet', 'brown rice', 'avocado', 'edamame', 'soy sauce'],
        instructions: ['Cook rice', 'Pan-sear salmon', 'Assemble bowl', 'Top with avocado'],
        prepTime: 15,
        cookTime: 25,
      },
    ];
  }

  setNutritionGoals(userId: string, goals: SetNutritionGoalsInput): NutritionGoals {
    const parsed = SetNutritionGoalsSchema.parse(goals);

    const nutritionGoals: NutritionGoals = {
      id: randomUUID(),
      userId,
      dailyCalories: parsed.dailyCalories,
      proteinGrams: parsed.proteinGrams,
      carbsGrams: parsed.carbsGrams,
      fatGrams: parsed.fatGrams,
      updatedAt: new Date(),
    };

    this.goals.set(userId, nutritionGoals);
    return nutritionGoals;
  }

  scanBarcode(barcode: string): FoodItem | null {
    if (!barcode || barcode.trim().length === 0) {
      throw createAppError('Barcode is required', 400, 'VALIDATION_ERROR');
    }

    const found = FOOD_DATABASE.find((f) => f.barcode === barcode);
    return found ?? null;
  }

  private getMealsForDate(userId: string, date: string): MealEntry[] {
    const targetDate = date.split('T')[0] ?? date;
    const results: MealEntry[] = [];

    for (const meal of this.meals.values()) {
      if (meal.userId === userId) {
        const mealDate = meal.loggedAt.toISOString().split('T')[0];
        if (mealDate === targetDate) {
          results.push(meal);
        }
      }
    }

    return results;
  }
}
