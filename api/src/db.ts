import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export function createTursoClient(env: Env): Client {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

// Recipe types matching Turso schema
export interface Recipe {
  id: string;
  name_it: string;
  name_en: string;
  slug: string;
  description_it: string | null;
  description_en: string | null;
  category: string;
  image_url: string | null;
  prep_time_min: number;
  cook_time_min: number;
  total_time_min: number;
  servings: number;
  difficulty: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  kcal_per_serving: number;
  serving_weight_g: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes_it: string | null;
  notes_en: string | null;
  display_order: number;
  // Joined from ingredients table
  ingredient_name_it?: string;
  ingredient_name_en?: string;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction_it: string;
  instruction_en: string;
  image_url: string | null;
}
