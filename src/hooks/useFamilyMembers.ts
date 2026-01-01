import { db } from "@/db/client";
import { familyMembers } from "@/db/schema";
import type { AddFamilyMemberInput } from "@/schemas/auth";
import type { FamilyMember } from "@/schemas/familyMember";
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from "@/services/familyMember.service";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

export const FAMILY_KEYS = {
  all: ["familyMembers"] as const,
  list: (userId: string) => [...FAMILY_KEYS.all, "list", userId] as const,
  detail: (id: string) => [...FAMILY_KEYS.all, "detail", id] as const,
};

/**
 * Hook to fetch all family members for the current user.
 */
export function useFamilyMembers() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: FAMILY_KEYS.list(user?.id ?? ""),
    queryFn: async () => {
      if (!user?.id) return [];

      const results = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id));

      return results as unknown as FamilyMember[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to fetch a specific family member.
 */
export function useFamilyMember(id: string) {
  return useQuery({
    queryKey: FAMILY_KEYS.detail(id),
    queryFn: async () => {
      const [result] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.id, id));

      return (result as unknown as FamilyMember) ?? null;
    },
    enabled: !!id,
  });
}

/**
 * Hook to add a new family member with cache invalidation.
 */
export function useAddFamilyMember() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (input: AddFamilyMemberInput) => {
      if (!user?.id) throw new Error("User not authenticated");
      return addFamilyMember(user.id, input);
    },
    onSuccess: () => {
      // Invalidate family members list so it refetches
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.all });
    },
  });
}

/**
 * Hook to update a family member with cache invalidation.
 */
export function useUpdateFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: Parameters<typeof updateFamilyMember>[1] }) =>
      updateFamilyMember(memberId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.detail(variables.memberId) });
    },
  });
}

/**
 * Hook to delete a family member with cache invalidation.
 */
export function useDeleteFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => deleteFamilyMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.all });
    },
  });
}
