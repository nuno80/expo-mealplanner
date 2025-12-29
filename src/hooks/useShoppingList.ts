import { getShoppingListForWeek } from "@/services/shoppingList.service";
import { useQuery } from "@tanstack/react-query";

export const SHOPPING_LIST_KEYS = {
  all: ["shoppingList"] as const,
  forWeek: (familyMemberId: string, weekStart: Date, days: number[]) =>
    [...SHOPPING_LIST_KEYS.all, familyMemberId, weekStart.toISOString(), days.join(",")] as const,
};

export function useShoppingList(
  familyMemberId: string | null | undefined,
  weekStart: Date,
  days: number[] = [],
) {
  return useQuery({
    queryKey: SHOPPING_LIST_KEYS.forWeek(
      familyMemberId ?? "",
      weekStart,
      days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7],
    ),
    queryFn: () =>
      getShoppingListForWeek(
        familyMemberId!,
        weekStart,
        days.length > 0 ? days : [],
      ),
    enabled: !!familyMemberId,
  });
}
