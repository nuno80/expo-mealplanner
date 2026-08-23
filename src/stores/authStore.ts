import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase, wipeStoredSession } from "@/lib/supabase";
import type {
	OnboardingGoalInput,
	OnboardingProfileInput,
	OnboardingTdeeInput,
} from "@/schemas/auth";

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
	session: Session | null;
	user: User | null;
	isLoading: boolean;
	isInitialized: boolean;
	hasCompletedOnboarding: boolean;
	currentOnboardingStep: OnboardingStep;
	onboardingData: OnboardingData;
	setSession: (session: Session | null) => void;
	signOut: () => Promise<void>;
	initialize: () => () => void;
	setOnboardingStep: (step: OnboardingStep) => void;
	setOnboardingGoal: (data: OnboardingGoalInput) => void;
	setOnboardingProfile: (data: OnboardingProfileInput) => void;
	setOnboardingTdee: (data: OnboardingTdeeInput) => void;
	completeOnboarding: () => void;
	resetOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	session: null,
	user: null,
	isLoading: true,
	isInitialized: false,
	hasCompletedOnboarding: false,
	currentOnboardingStep: "goal",
	onboardingData: {},

	setSession: (session) =>
		set({ session, user: session?.user ?? null, isLoading: false }),

	signOut: async () => {
		try {
			await supabase.auth.signOut();
		} catch (e: any) {
			console.warn("[Auth] signOut network error:", e?.message || e);
		}
		try {
			await wipeStoredSession();
		} catch (e: any) {
			console.warn("[Auth] session wipe failed:", e?.message || e);
		}
		set({
			session: null,
			user: null,
			hasCompletedOnboarding: false,
			currentOnboardingStep: "goal",
			onboardingData: {},
		});
	},

	/**
	 * Subscribe before reading the persisted session and ignore a stale
	 * getSession result after a live login event. Without this guard, a login
	 * can succeed, emit SIGNED_IN, and then be overwritten by the initial null
	 * session read, making the UI look like credentials were invalid until the
	 * next app launch.
	 */
	initialize: () => {
		console.log("[Auth] initialize() starting...");
		let authEventReceived = false;
		try {
			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange((_event, session) => {
				authEventReceived = true;
				console.log("[Auth] onAuthStateChange event:", _event, !!session);
				get().setSession(session);
			});

			supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				if (authEventReceived) return;
				console.log("[Auth] getSession success:", !!session);
				get().setSession(session);
				set({ isInitialized: true });
			})
			.catch((err) => {
				console.error("[Auth] getSession failed:", err.message || err);
				set({ isLoading: false, isInitialized: true });
			});

			return () => subscription.unsubscribe();
		} catch (error: any) {
			console.error("[Auth] initialization fatal error:", error.message || error);
			set({ isLoading: false, isInitialized: true });
			return () => {};
		}
	},

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
