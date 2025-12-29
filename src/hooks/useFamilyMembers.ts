import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { familyMembers } from "@/db/schema";
import type { FamilyMember } from "@/schemas/familyMember";
import { useAuthStore } from "@/stores/authStore";

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
