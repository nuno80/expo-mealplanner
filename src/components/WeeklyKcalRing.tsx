import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface WeeklyKcalRingProps {
	current: number;
	target: number;
	completedMeals: number;
	totalMeals: number;
}

/**
 * Circular progress ring showing weekly calorie consumption.
 */
export function WeeklyKcalRing({
	current,
	target,
	completedMeals,
	totalMeals,
}: WeeklyKcalRingProps) {
	const size = 140;
	const strokeWidth = 12;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	const progress = target > 0 ? Math.min(current / target, 1.2) : 0;
	const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

	const isOver = progress > 1;
	const percentage = Math.round(progress * 100);

	// Color based on progress
	const progressColor = isOver ? "#EF4444" : "#10B981";

	return (
		<View className="bg-white rounded-2xl p-5 shadow-sm border border-ui-100">
			<View className="flex-row items-center">
				{/* Ring */}
				<View className="relative items-center justify-center">
					<Svg width={size} height={size}>
						{/* Background circle */}
						<Circle
							cx={size / 2}
							cy={size / 2}
							r={radius}
							stroke="#E5E7EB"
							strokeWidth={strokeWidth}
							fill="transparent"
						/>
						{/* Progress circle */}
						<Circle
							cx={size / 2}
							cy={size / 2}
							r={radius}
							stroke={progressColor}
							strokeWidth={strokeWidth}
							fill="transparent"
							strokeDasharray={circumference}
							strokeDashoffset={strokeDashoffset}
							strokeLinecap="round"
							transform={`rotate(-90 ${size / 2} ${size / 2})`}
						/>
					</Svg>
					{/* Center text */}
					<View className="absolute items-center justify-center">
						<Text
							className="text-3xl font-bold"
							style={{ color: progressColor }}
						>
							{percentage}%
						</Text>
						<Text className="text-xs text-ui-400">target</Text>
					</View>
				</View>

				{/* Stats */}
				<View className="flex-1 ml-5">
					<Text className="text-lg font-bold text-ui-900 mb-1">
						Calorie Settimana
					</Text>
					<Text className="text-sm text-ui-500 mb-3">
						{current.toLocaleString()} / {target.toLocaleString()} kcal
					</Text>

					<View className="flex-row items-center gap-2 mb-1">
						<View className="w-2 h-2 rounded-full bg-success-500" />
						<Text className="text-xs text-ui-600">
							{completedMeals} pasti completati
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<View className="w-2 h-2 rounded-full bg-ui-300" />
						<Text className="text-xs text-ui-400">
							{totalMeals - completedMeals} rimanenti
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
