import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionService } from '../services/nutrition.service';

describe('NutritionService', () => {
  let service: NutritionService;

  beforeEach(() => {
    service = new NutritionService();
  });

  describe('logMeal', () => {
    it('logs a meal with calculated totals', () => {
      const input = {
        mealType: 'lunch' as const,
        foods: [
          {
            name: 'Chicken Breast',
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            fiber: 0,
            servingSize: 100,
            servingUnit: 'g',
            barcode: null,
            brand: null,
          },
          {
            name: 'Brown Rice',
            calories: 216,
            protein: 5,
            carbs: 45,
            fat: 1.8,
            fiber: 3.5,
            servingSize: 195,
            servingUnit: 'g',
            barcode: null,
            brand: null,
          },
        ],
      };

      const meal = service.logMeal('user-1', input);

      expect(meal.id).toBeDefined();
      expect(meal.userId).toBe('user-1');
      expect(meal.mealType).toBe('lunch');
      expect(meal.foods).toHaveLength(2);
      expect(meal.totalCalories).toBe(381);
      expect(meal.totalProtein).toBe(36);
      expect(meal.totalCarbs).toBe(45);
      expect(meal.totalFat).toBeCloseTo(5.4);
      expect(meal.loggedAt).toBeInstanceOf(Date);
    });

    it('throws on empty foods array', () => {
      expect(() => service.logMeal('user-1', { mealType: 'lunch', foods: [] })).toThrow();
    });

    it('supports all meal types', () => {
      const types = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

      for (const mealType of types) {
        const meal = service.logMeal('user-1', {
          mealType,
          foods: [
            {
              name: 'Food',
              calories: 100,
              protein: 10,
              carbs: 10,
              fat: 5,
              fiber: 2,
              servingSize: 1,
              servingUnit: 'serving',
              barcode: null,
              brand: null,
            },
          ],
        });
        expect(meal.mealType).toBe(mealType);
      }
    });
  });

  describe('searchFood', () => {
    it('finds foods matching query', () => {
      const results = service.searchFood('chicken');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.name.toLowerCase()).toContain('chicken');
    });

    it('returns empty array for no matches', () => {
      const results = service.searchFood('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('throws on empty query', () => {
      expect(() => service.searchFood('')).toThrow();
    });

    it('searches by brand name', () => {
      const results = service.searchFood('fage');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getMacros', () => {
    it('returns macro summary with consumed and goals', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      service.logMeal('user-1', {
        mealType: 'lunch',
        foods: [
          {
            name: 'Chicken',
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            fiber: 0,
            servingSize: 100,
            servingUnit: 'g',
            barcode: null,
            brand: null,
          },
        ],
      });

      const macros = service.getMacros('user-1', today);

      expect(macros.userId).toBe('user-1');
      expect(macros.calories.consumed).toBe(165);
      expect(macros.protein.consumed).toBe(31);
      expect(macros.calories.goal).toBe(2000);
    });

    it('uses custom goals when set', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      service.setNutritionGoals('user-1', {
        dailyCalories: 2500,
        proteinGrams: 180,
        carbsGrams: 300,
        fatGrams: 80,
      });

      const macros = service.getMacros('user-1', today);
      expect(macros.calories.goal).toBe(2500);
      expect(macros.protein.goal).toBe(180);
    });
  });

  describe('scanBarcode', () => {
    it('returns food item for known barcode', () => {
      const food = service.scanBarcode('123456789');
      expect(food).not.toBeNull();
      expect(food!.name).toBe('Chicken Breast');
    });

    it('returns null for unknown barcode', () => {
      const food = service.scanBarcode('000000000');
      expect(food).toBeNull();
    });

    it('throws on empty barcode', () => {
      expect(() => service.scanBarcode('')).toThrow();
    });
  });

  describe('createMealPlan', () => {
    it('generates a meal plan with days and meals', () => {
      const plan = service.createMealPlan('user-1', {});

      expect(plan.id).toBeDefined();
      expect(plan.userId).toBe('user-1');
      expect(plan.days.length).toBeGreaterThan(0);
      expect(plan.days[0]!.meals.length).toBeGreaterThan(0);
    });
  });

  describe('setNutritionGoals', () => {
    it('creates and returns nutrition goals', () => {
      const goals = service.setNutritionGoals('user-1', {
        dailyCalories: 2200,
        proteinGrams: 160,
        carbsGrams: 270,
        fatGrams: 70,
      });

      expect(goals.id).toBeDefined();
      expect(goals.userId).toBe('user-1');
      expect(goals.dailyCalories).toBe(2200);
      expect(goals.proteinGrams).toBe(160);
    });

    it('throws on invalid goals', () => {
      expect(() =>
        service.setNutritionGoals('user-1', {
          dailyCalories: -100,
          proteinGrams: 160,
          carbsGrams: 270,
          fatGrams: 70,
        }),
      ).toThrow();
    });
  });
});
