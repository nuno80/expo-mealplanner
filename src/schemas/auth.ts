import { z } from "zod";

// ============================================================================
// ENUMS
// SQLite stores these as text; Zod enforces valid values at runtime.
// ============================================================================

export const SexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof SexSchema>;

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const GoalSchema = z.enum(["cut", "maintain", "bulk"]);
export type Goal = z.infer<typeof GoalSchema>;

export const LocaleSchema = z.enum(["it", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const SignupSchema = z
  .object({
    email: z.string().email("Email non valida"),
    password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof SignupSchema>;

// ============================================================================
// ONBOARDING SCHEMAS
// ============================================================================

/** Step 1: Goal selection */
export const OnboardingGoalSchema = z.object({
  goal: GoalSchema,
  calorieAdjustment: z.number().int(), // e.g., -400 for cut, +300 for bulk
});
export type OnboardingGoalInput = z.infer<typeof OnboardingGoalSchema>;

/** Step 2: Profile stats */
export const OnboardingProfileSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  birthYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() - 10), // At least 10 years old
  sex: SexSchema,
  heightCm: z.number().int().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  activityLevel: ActivityLevelSchema,
});
export type OnboardingProfileInput = z.infer<typeof OnboardingProfileSchema>;

/** Step 3: TDEE confirmation (optional macro customization) */
export const OnboardingTdeeSchema = z.object({
  tdee: z.number().int().positive(),
  targetKcal: z.number().int().positive(),
  macroProteinPct: z.number().int().min(10).max(60).default(30),
  macroCarbPct: z.number().int().min(10).max(70).default(40),
  macroFatPct: z.number().int().min(10).max(60).default(30),
  snacksEnabled: z.boolean().default(false),
});
export type OnboardingTdeeInput = z.infer<typeof OnboardingTdeeSchema>;

// ============================================================================
// FAMILY MEMBER SCHEMA (full)
// ============================================================================

export const FamilyMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  isPrimary: z.boolean(),
  birthYear: z.number().int(),
  sex: SexSchema,
  heightCm: z.number().int(),
  weightKg: z.number(),
  activityLevel: ActivityLevelSchema,
  goal: GoalSchema,
  calorieAdjustment: z.number().int(),
  tdee: z.number().int(),
  targetKcal: z.number().int(),
  macroProteinPct: z.number().int(),
  macroCarbPct: z.number().int(),
  macroFatPct: z.number().int(),
  snacksEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FamilyMember = z.infer<typeof FamilyMemberSchema>;

/** Schema for adding a new family member (during onboarding or later) */
export const AddFamilyMemberSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  sex: SexSchema,
  heightCm: z.number().int().min(50).max(250),
  weightKg: z.number().min(10).max(300),
  activityLevel: ActivityLevelSchema,
  goal: GoalSchema,
  calorieAdjustment: z.number().int().optional().default(0),
  snacksEnabled: z.boolean().optional().default(false),
  // NutriPlanIT 2.0: Dynamic Macro Targets
  macroProteinPct: z.number().int().min(10).max(60).optional(),
  macroCarbPct: z.number().int().min(10).max(70).optional(),
  macroFatPct: z.number().int().min(10).max(60).optional(),
});
export type AddFamilyMemberInput = z.infer<typeof AddFamilyMemberSchema>;

// ============================================================================
// USER SCHEMA
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullish(),
  locale: LocaleSchema,
  isPremium: z.boolean(),
  premiumUntil: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;
