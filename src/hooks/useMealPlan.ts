import type {
  GenerateMealPlanInput,
  SwapMealInput
} from "@/schemas/mealPlan";
import {
  completeMeal,
  generateMealPlan,
  getMealPlan,
  regenerateDay,
  swapMeal,
} from "@/services/mealPlan.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const mealPlanKeys = {
  all: ["mealPlans"] as const,
  details: () => [...mealPlanKeys.all, "detail"] as const,
  detail: (memberId: string, weekStart: Date) =>
    [...mealPlanKeys.details(), memberId, weekStart.toISOString()] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get the meal plan for a family member for a specific week.
 */
export function useMealPlan(
  familyMemberId: string | undefined,
  weekStart: Date | undefined,
) {
  return useQuery({
    queryKey: mealPlanKeys.detail(familyMemberId ?? "", weekStart ?? new Date()),
    queryFn: () =>
      familyMemberId && weekStart
        ? getMealPlan(familyMemberId, weekStart)
        : Promise.resolve(null),
    enabled: !!familyMemberId && !!weekStart,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Generate a new meal plan.
 */
export function useGenerateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateMealPlanInput) => generateMealPlan(input),
    onSuccess: (data, variables) => {
      // Update the cache with the new plan
      queryClient.setQueryData(
        mealPlanKeys.detail(variables.familyMemberId, variables.weekStart),
        data,
      );
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Swap a meal with a different recipe.
 */
export function useSwapMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SwapMealInput) => swapMeal(input),
    onSuccess: () => {
      // Invalidate all meal plan queries to refetch
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Mark a meal as completed.
 */
export function useCompleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plannedMealId: string) => completeMeal(plannedMealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Regenerate meals for a specific day.
 */
export function useRegenerateDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mealPlanId, day }: { mealPlanId: string; day: number }) =>
      regenerateDay(mealPlanId, day),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the start of the current week (Monday).
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get week start for a relative week offset.
 */
export function getWeekStart(weekOffset: number = 0): Date {
  const monday = getCurrentWeekStart();
  monday.setDate(monday.getDate() + weekOffset * 7);
  return monday;
}
