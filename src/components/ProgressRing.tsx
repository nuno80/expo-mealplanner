import { Text, View } from "react-native";

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  label?: string;
  unit?: string;
}

/**
 * Modern Progress Ring (No SVG dependency fallback).
 * Uses nested circles for a clean look.
 */
export function ProgressRing({
  current,
  target,
  size = 120,
  label,
  unit = "kcal",
}: ProgressRingProps) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const isOver = current > target;
  const colorClass = isOver ? "bg-red-500" : "bg-brand-500";
  const bgClass = isOver ? "bg-red-100" : "bg-brand-100";
  const textClass = isOver ? "text-red-600" : "text-brand-600";

  return (
    <View
      className={`items-center justify-center rounded-full border-4 border-ui-100 ${bgClass}`}
      style={{ width: size, height: size }}
    >
      <View className="items-center">
        <Text className={`text-3xl font-bold ${textClass} tracking-tighter`}>
          {current}
        </Text>
        <Text className="text-[10px] font-bold text-ui-400 uppercase tracking-widest mt-0.5">
          {unit}
        </Text>

        {/* Mini pill for percentage */}
        <View className={`mt-2 px-2 py-0.5 rounded-full ${isOver ? 'bg-red-200' : 'bg-brand-200'}`}>
          <Text className={`text-[10px] font-bold ${isOver ? 'text-red-700' : 'text-brand-700'}`}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
}

interface ProgressBarProps {
  current: number;
  target: number;
  height?: number;
  showLabel?: boolean;
  color?: string; // Hex override
}

export function ProgressBar({
  current,
  target,
  height = 6,
  showLabel = true,
  color,
}: ProgressBarProps) {
  const progress = Math.min(current / target, 1);
  const isOver = current > target;

  return (
    <View className="w-full">
      <View
        className="w-full rounded-full bg-ui-100 overflow-hidden"
        style={{ height }}
      >
        <View
          className={`h-full rounded-full ${isOver ? "bg-red-500" : "bg-brand-500"}`}
          style={{
            width: `${progress * 100}%`,
            ...(color && !isOver ? { backgroundColor: color } : {}),
          }}
        />
      </View>
      {showLabel && (
        <View className="flex-row justify-between mt-1.5">
          <Text className={`text-xs font-medium ${isOver ? "text-red-500" : "text-ui-600"}`}>
            {current.toLocaleString()}
          </Text>
          <Text className="text-xs font-medium text-ui-400">
            {target.toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}
