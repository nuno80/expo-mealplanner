import type { GenerateMealPlanInput, SwapMealInput } from "@/schemas/mealPlan";
import {
  completeMeal,
  deleteMealPlanForWeek,
  generateMealPlan,
  getMealPlan,
  getMealPlanStatus,
  getSwapAlternatives,
  regenerateDay,
  swapMeal,
  swapMealRandom,
  toggleSnackForDay,
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
    queryKey: mealPlanKeys.detail(
      familyMemberId ?? "",
      weekStart ?? new Date(),
    ),
    queryFn: () =>
      familyMemberId && weekStart
        ? getMealPlan(familyMemberId, weekStart)
        : Promise.resolve(null),
    enabled: !!familyMemberId && !!weekStart,
    staleTime: 1000 * 30, // 30 seconds - fresher data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
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
      // Defer cache updates to avoid "navigation context" error during render
      queueMicrotask(() => {
        // Update the cache with the new plan
        queryClient.setQueryData(
          mealPlanKeys.detail(variables.familyMemberId, variables.weekStart),
          data,
        );
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      });
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
// MEAL PLAN ENHANCEMENTS (Jan 2026)
// ============================================================================

/**
 * Get meal plan status (exists, completed meals count).
 * Used to confirm before regenerating.
 */
export function useMealPlanStatus(
  familyMemberId: string | undefined,
  weekStart: Date | undefined,
) {
  return useQuery({
    queryKey: [...mealPlanKeys.all, "status", familyMemberId, weekStart?.toISOString()],
    queryFn: () =>
      familyMemberId && weekStart
        ? getMealPlanStatus(familyMemberId, weekStart)
        : Promise.resolve({ exists: false, planId: null, completedMealsCount: 0, totalMealsCount: 0 }),
    enabled: !!familyMemberId && !!weekStart,
  });
}

/**
 * Delete existing meal plan for a week (before regenerating).
 */
export function useDeleteMealPlanForWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyMemberId, weekStart }: { familyMemberId: string; weekStart: Date }) =>
      deleteMealPlanForWeek(familyMemberId, weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Get alternative recipes for swapping a meal.
 */
export function useSwapAlternatives(
  plannedMealId: string | undefined,
  options?: { limit?: number; similarKcal?: boolean },
) {
  return useQuery({
    queryKey: [...mealPlanKeys.all, "alternatives", plannedMealId, options],
    queryFn: () =>
      plannedMealId
        ? getSwapAlternatives(plannedMealId, options)
        : Promise.resolve([]),
    enabled: !!plannedMealId,
  });
}

/**
 * Swap a meal with a random alternative.
 */
export function useSwapMealRandom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plannedMealId: string) => swapMealRandom(plannedMealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Toggle snacks for a specific day.
 */
export function useToggleSnackForDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mealPlanId,
      day,
      enabled,
    }: {
      mealPlanId: string;
      day: number;
      enabled: boolean;
    }) => toggleSnackForDay(mealPlanId, day, enabled),
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
