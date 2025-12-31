/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				// Brand Color (Orange-ish for vibrancy)
				brand: {
					50: "#fff7ed",
					100: "#ffedd5",
					200: "#fed7aa",
					300: "#fdba74",
					400: "#fb923c",
					500: "#f97316", // Primary Brand
					600: "#ea580c",
					700: "#c2410c",
					800: "#9a3412",
					900: "#7c2d12",
				},
				// Alias for primary (used in many components)
				primary: {
					50: "#fff7ed",
					100: "#ffedd5",
					200: "#fed7aa",
					300: "#fdba74",
					400: "#fb923c",
					500: "#f97316",
					600: "#ea580c",
					700: "#c2410c",
					800: "#9a3412",
					900: "#7c2d12",
				},
				// Secondary/Success (Green)
				success: {
					50: "#f0fdf4",
					100: "#dcfce7",
					500: "#22c55e",
					600: "#16a34a",
					700: "#15803d",
				},
				// UI Grays (Slate)
				ui: {
					50: "#f8fafc",
					100: "#f1f5f9",
					200: "#e2e8f0",
					300: "#cbd5e1",
					400: "#94a3b8",
					500: "#64748b",
					600: "#475569",
					700: "#334155",
					800: "#1e293b",
					900: "#0f172a",
				},
			},
			borderRadius: {
				"3xl": "24px",
				"4xl": "32px",
			},
			fontFamily: {
				// Default sans stack usually fine, but defined here if needed later
			},
		},
	},
	plugins: [],
};
