import type { RecipeCategory } from "@/schemas/recipe";
import {
  getRecipeById,
  getRecipes,
  searchRecipes,
} from "@/services/recipe.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const recipeKeys = {
  all: ["recipes"] as const,
  lists: () => [...recipeKeys.all, "list"] as const,
  list: (category?: RecipeCategory) => [...recipeKeys.lists(), { category }] as const,
  details: () => [...recipeKeys.all, "detail"] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  search: (query: string) => [...recipeKeys.all, "search", query] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get all recipes, optionally filtered by category.
 */
export function useRecipes(category?: RecipeCategory) {
  return useQuery({
    queryKey: recipeKeys.list(category),
    queryFn: () => getRecipes(category),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single recipe with full details (ingredients + steps).
 */
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? ""),
    queryFn: () => (id ? getRecipeById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Search recipes by name.
 * Uses a mutation pattern for on-demand search.
 */
export function useSearchRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: string) => searchRecipes(query),
    onSuccess: (data, query) => {
      // Cache the search results
      queryClient.setQueryData(recipeKeys.search(query), data);
    },
  });
}

/**
 * Prefetch recipes for a category (for tab preloading).
 */
export function usePrefetchRecipes() {
  const queryClient = useQueryClient();

  return (category?: RecipeCategory) => {
    queryClient.prefetchQuery({
      queryKey: recipeKeys.list(category),
      queryFn: () => getRecipes(category),
      staleTime: 1000 * 60 * 5,
    });
  };
}
