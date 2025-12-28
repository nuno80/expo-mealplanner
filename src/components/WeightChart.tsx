import React from "react";
import { Dimensions, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface WeightDataPoint {
	date: Date;
	weightKg: number;
}

interface WeightChartProps {
	data: WeightDataPoint[];
	period?: "30d" | "90d" | "all";
}

export function WeightChart({ data, period = "30d" }: WeightChartProps) {
	if (!data || data.length === 0) {
		return (
			<View className="h-64 items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
				<Text className="text-gray-400">Nessun dato disponibile</Text>
			</View>
		);
	}

	const screenWidth = Dimensions.get("window").width;

	// Reverse data for chart (oldest to newest)
	const chartData = [...data].reverse();

	const labels = chartData.map((d) =>
		d.date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
	);

	// Optimize labels to avoid clutter (show max 6 labels)
	const step = Math.ceil(labels.length / 6);
	const visibleLabels = labels.map((l, i) =>
		i % step === 0 || i === labels.length - 1 ? l : "",
	);

	const weights = chartData.map((d) => d.weightKg);

	return (
		<View className="items-center bg-white rounded-2xl overflow-hidden shadow-sm">
			<LineChart
				data={{
					labels: visibleLabels,
					datasets: [
						{
							data: weights,
							color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Purple-500
							strokeWidth: 3,
						},
					],
				}}
				width={screenWidth - 48} // Padding consideration
				height={220}
				yAxisSuffix=" kg"
				chartConfig={{
					backgroundColor: "#ffffff",
					backgroundGradientFrom: "#ffffff",
					backgroundGradientTo: "#ffffff",
					decimalPlaces: 1,
					color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
					labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
					style: {
						borderRadius: 16,
					},
					propsForDots: {
						r: "4",
						strokeWidth: "2",
						stroke: "#a855f7",
					},
					propsForBackgroundLines: {
						strokeDasharray: "", // Solid lines
						stroke: "#f3f4f6",
					},
				}}
				bezier
				style={{
					marginVertical: 8,
					borderRadius: 16,
				}}
				withVerticalLines={false}
			/>
		</View>
	);
}
