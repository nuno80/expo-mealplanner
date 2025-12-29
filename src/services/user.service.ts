import { db } from "@/db/client";
import { familyMembers, users } from "@/db/schema";
import { calculateTargetKcal, calculateTDEE } from "@/lib/tdee";
import type {
  AddFamilyMemberInput,
  FamilyMember,
  OnboardingGoalInput,
  OnboardingProfileInput,
  OnboardingTdeeInput,
} from "@/schemas/auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user in local DB after Supabase signup.
 * If user already exists, does nothing (idempotent).
 */
export async function createUser(
  supabaseUserId: string,
  email: string,
  displayName?: string,
): Promise<void> {
  // Check if user already exists (idempotent)
  const existing = await db.select().from(users).where(eq(users.id, supabaseUserId));
  if (existing.length > 0) {
    return; // User already exists, nothing to do
  }

  await db.insert(users).values({
    id: supabaseUserId,
    email,
    displayName: displayName ?? null,
    locale: "it",
    isPremium: false,
    premiumUntil: null,
  });
}

/**
 * Get user by ID.
 * Returns the raw Drizzle type; apply Zod parsing at API boundaries if needed.
 */
export async function getUserById(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] ?? null;
}

/**
 * Update user locale.
 */
export async function updateUserLocale(
  userId: string,
  locale: "it" | "en",
): Promise<void> {
  await db
    .update(users)
    .set({ locale, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ============================================================================
// FAMILY MEMBER OPERATIONS
// ============================================================================

/**
 * Create the primary family member during onboarding.
 * Combines Goal, Profile, and TDEE data into a single insert.
 */
export async function createPrimaryMember(
  userId: string,
  profile: OnboardingProfileInput,
  goal: OnboardingGoalInput,
  tdee: OnboardingTdeeInput,
): Promise<string> {
  const memberId = randomUUID();

  await db.insert(familyMembers).values({
    id: memberId,
    userId,
    name: profile.name,
    isPrimary: true,
    birthYear: profile.birthYear,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
    goal: goal.goal,
    calorieAdjustment: goal.calorieAdjustment,
    tdee: tdee.tdee,
    targetKcal: tdee.targetKcal,
    macroProteinPct: tdee.macroProteinPct,
    macroCarbPct: tdee.macroCarbPct,
    macroFatPct: tdee.macroFatPct,
    snacksEnabled: tdee.snacksEnabled,
  });

  return memberId;
}

/**
 * Add a secondary family member.
 */
export async function addFamilyMember(
  userId: string,
  input: AddFamilyMemberInput,
): Promise<string> {
  const memberId = randomUUID();

  // Calculate TDEE for the new member
  const { tdee } = calculateTDEE({
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    birthYear: input.birthYear,
    activityLevel: input.activityLevel,
  });

  const targetKcal = calculateTargetKcal(tdee, input.calorieAdjustment ?? 0);

  await db.insert(familyMembers).values({
    id: memberId,
    userId,
    name: input.name,
    isPrimary: false,
    birthYear: input.birthYear,
    sex: input.sex,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activityLevel: input.activityLevel,
    goal: input.goal,
    calorieAdjustment: input.calorieAdjustment ?? 0,
    tdee,
    targetKcal,
    macroProteinPct: 30, // Default
    macroCarbPct: 40,
    macroFatPct: 30,
    snacksEnabled: input.snacksEnabled ?? false,
  });

  return memberId;
}

/**
 * Get all family members for a user.
 */
export async function getFamilyMembers(
  userId: string,
): Promise<FamilyMember[]> {
  const result = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  return result as FamilyMember[];
}

/**
 * Get the primary family member (the user themselves).
 */
export async function getPrimaryMember(
  userId: string,
): Promise<FamilyMember | null> {
  const result = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  const primary = result.find((m) => m.isPrimary);
  return (primary as FamilyMember) ?? null;
}

/**
 * Update a family member's weight (for progress tracking).
 */
export async function updateMemberWeight(
  memberId: string,
  weightKg: number,
): Promise<void> {
  // Note: This also needs to recalculate TDEE
  const member = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId));

  if (!member[0]) return;

  const m = member[0];

  const { tdee } = calculateTDEE({
    sex: m.sex as "male" | "female",
    weightKg,
    heightCm: m.heightCm,
    birthYear: m.birthYear,
    activityLevel: m.activityLevel as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active",
  });

  const targetKcal = calculateTargetKcal(tdee, m.calorieAdjustment);

  await db
    .update(familyMembers)
    .set({
      weightKg,
      tdee,
      targetKcal,
      updatedAt: new Date(),
    })
    .where(eq(familyMembers.id, memberId));
}

/**
 * Delete a family member.
 */
export async function deleteFamilyMember(memberId: string): Promise<void> {
  await db.delete(familyMembers).where(eq(familyMembers.id, memberId));
}
