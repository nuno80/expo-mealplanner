/**
 * API configuration for recipe sync
 */

import { Platform } from "react-native";

// Development: use local wrangler dev server
// Production: use deployed Cloudflare Worker URL
const DEV_API_URL = "http://localhost:8787";
const PROD_API_URL = "https://nutriplanit-api.nutriplanit.workers.dev";

// Use PROD_API_URL in development to verify deployment
const USE_PROD_IN_DEV = true;

export const API_BASE_URL =
  __DEV__ && !USE_PROD_IN_DEV
    ? Platform.OS === "android"
      ? "http://10.0.2.2:8787"
      : DEV_API_URL
    : PROD_API_URL;

/**
 * Recipe API response types
 */
export interface ApiRecipe {
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

export interface ApiRecipesResponse {
  success: boolean;
  count: number;
  data: ApiRecipe[];
}
