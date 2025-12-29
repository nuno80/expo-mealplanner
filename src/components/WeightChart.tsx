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
      <View
        style={{
          height: 256,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "#d1d5db",
        }}
      >
        <Text style={{ color: "#9ca3af" }}>Nessun dato disponibile</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const chartData = [...data].reverse();
  const labels = chartData.map((d) =>
    d.date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
  );
  const step = Math.ceil(labels.length / 6);
  const visibleLabels = labels.map((l, i) =>
    i % step === 0 || i === labels.length - 1 ? l : "",
  );
  const weights = chartData.map((d) => d.weightKg);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <LineChart
        data={{
          labels: visibleLabels,
          datasets: [
            {
              data: weights,
              color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
              strokeWidth: 3,
            },
          ],
        }}
        width={screenWidth - 48}
        height={220}
        yAxisSuffix=" kg"
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: "4", strokeWidth: "2", stroke: "#a855f7" },
          propsForBackgroundLines: { strokeDasharray: "", stroke: "#f3f4f6" },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
        withVerticalLines={false}
      />
    </View>
  );
}
