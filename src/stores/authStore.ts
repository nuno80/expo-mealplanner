import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
	OnboardingGoalInput,
	OnboardingProfileInput,
	OnboardingTdeeInput,
} from "@/schemas/auth";

// ============================================================================
// TYPES
// ============================================================================

export type OnboardingStep =
	| "goal"
	| "profile"
	| "tdee"
	| "family"
	| "complete";

interface OnboardingData {
	goal?: OnboardingGoalInput;
	profile?: OnboardingProfileInput;
	tdee?: OnboardingTdeeInput;
}

interface AuthState {
	// Auth state
	session: Session | null;
	user: User | null;
	isLoading: boolean;
	isInitialized: boolean;

	// Onboarding state
	hasCompletedOnboarding: boolean;
	currentOnboardingStep: OnboardingStep;
	onboardingData: OnboardingData;

	// Actions
	setSession: (session: Session | null) => void;
	signOut: () => Promise<void>;
	initialize: () => () => void; // Returns unsubscribe function

	// Onboarding actions
	setOnboardingStep: (step: OnboardingStep) => void;
	setOnboardingGoal: (data: OnboardingGoalInput) => void;
	setOnboardingProfile: (data: OnboardingProfileInput) => void;
	setOnboardingTdee: (data: OnboardingTdeeInput) => void;
	completeOnboarding: () => void;
	resetOnboarding: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
	// Initial state
	session: null,
	user: null,
	isLoading: true,
	isInitialized: false,

	hasCompletedOnboarding: false,
	currentOnboardingStep: "goal",
	onboardingData: {},

	// Auth actions
	setSession: (session) =>
		set({
			session,
			user: session?.user ?? null,
			isLoading: false,
		}),

	signOut: async () => {
		await supabase.auth.signOut();
		set({
			session: null,
			user: null,
			hasCompletedOnboarding: false,
			currentOnboardingStep: "goal",
			onboardingData: {},
		});
	},

	/**
	 * Initialize auth listener.
	 * Call this in the root layout and store the unsubscribe function.
	 */
	initialize: () => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			get().setSession(session);
			set({ isInitialized: true });
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			get().setSession(session);
		});

		return () => subscription.unsubscribe();
	},

	// Onboarding actions
	setOnboardingStep: (step) => set({ currentOnboardingStep: step }),

	setOnboardingGoal: (data) =>
		set((state) => ({
			onboardingData: { ...state.onboardingData, goal: data },
			currentOnboardingStep: "profile",
		})),

	setOnboardingProfile: (data) =>
		set((state) => ({
			onboardingData: { ...state.onboardingData, profile: data },
			currentOnboardingStep: "tdee",
		})),

	setOnboardingTdee: (data) =>
		set((state) => ({
			onboardingData: { ...state.onboardingData, tdee: data },
			currentOnboardingStep: "family",
		})),

	completeOnboarding: () =>
		set({
			hasCompletedOnboarding: true,
			currentOnboardingStep: "complete",
			onboardingData: {},
		}),

	resetOnboarding: () =>
		set({
			hasCompletedOnboarding: false,
			currentOnboardingStep: "goal",
			onboardingData: {},
		}),
}));
