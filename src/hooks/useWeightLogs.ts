import { useQuery } from "@tanstack/react-query";
import {
	getWeightChange,
	getWeightHistory,
} from "@/services/weightLog.service";

export const WEIGHT_KEYS = {
	all: ["weightLogs"] as const,
	list: (memberId: string) => [...WEIGHT_KEYS.all, "list", memberId] as const,
	change: (memberId: string) =>
		[...WEIGHT_KEYS.all, "change", memberId] as const,
};

export function useWeightHistory(familyMemberId: string | null) {
	return useQuery({
		queryKey: WEIGHT_KEYS.list(familyMemberId ?? ""),
		queryFn: () => getWeightHistory(familyMemberId!),
		enabled: !!familyMemberId,
	});
}

export function useWeightChange(familyMemberId: string | null, days = 30) {
	return useQuery({
		queryKey: [...WEIGHT_KEYS.change(familyMemberId ?? ""), days],
		queryFn: () => getWeightChange(familyMemberId!, days),
		enabled: !!familyMemberId,
	});
}
