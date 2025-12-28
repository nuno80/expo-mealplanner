import { create } from "zustand";

interface FamilyState {
	selectedMemberId: string | null;
	setSelectedMemberId: (id: string) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
	selectedMemberId: null, // If null, effects should default to primary member
	setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));
