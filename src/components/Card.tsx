import type { ReactNode } from "react";
import { View } from "react-native";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "elevated" | "flat" | "outlined";
}

/**
 * Premium Card component.
 * Supports variants: elevated (shadow), flat (bg-gray), outlined (border).
 */
export function Card({ children, className = "", variant = "elevated" }: CardProps) {
  const baseStyle = "rounded-3xl p-5";

  const variants = {
    elevated: "bg-white shadow-sm shadow-ui-200/50", // Softer shadow
    flat: "bg-ui-50",
    outlined: "bg-white border border-ui-100",
  };

  const shadowStyle = variant === "elevated" ? {
    shadowColor: "#64748b", // slate-500
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  } : {};

  return (
    <View
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={shadowStyle}
    >
      {children}
    </View>
  );
}
