import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import type { RecipeListItem } from "@/schemas/recipe";

interface RecipeCardProps {
	recipe: RecipeListItem;
	locale?: "it" | "en";
	onPress?: () => void;
}

export function RecipeCard({
	recipe,
	locale = "it",
	onPress,
}: RecipeCardProps) {
	const name = locale === "it" ? recipe.nameIt : recipe.nameEn;
	const difficultyColor =
		recipe.difficulty === "easy"
			? "#86efac"
			: recipe.difficulty === "medium"
				? "#fde047"
				: "#fca5a5";
	const difficultyLabel =
		recipe.difficulty === "easy"
			? "Easy"
			: recipe.difficulty === "medium"
				? "Med"
				: "Hard";

	return (
		<Pressable
			onPress={onPress}
			className="bg-white rounded-3xl overflow-hidden mb-1 flex-1 h-[240px]"
			style={{
				shadowColor: "#64748b",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 10,
				elevation: 5,
			}}
		>
			<View className="absolute inset-0 bg-ui-100">
				{recipe.imageUrl ? (
					<Image
						source={{ uri: recipe.imageUrl }}
						contentFit="cover"
						className="w-full h-full"
						transition={300}
						cachePolicy="memory-disk"
					/>
				) : (
					<View className="w-full h-full items-center justify-center bg-ui-100">
						<Text className="text-4xl opacity-30">🍽️</Text>
					</View>
				)}
				<View className="absolute inset-0 bg-black/30" />
				<View
					className="absolute bottom-0 left-0 right-0 h-32 bg-black/60"
					style={{ opacity: 0.8 }}
				/>
			</View>
			<View className="absolute top-3 left-3 flex-row gap-2">
				{recipe.totalTimeMin ? (
					<View className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center gap-1">
						<Text className="text-[10px] font-bold text-ui-900">
							{"⏱ " + recipe.totalTimeMin + "m"}
						</Text>
					</View>
				) : null}
			</View>
			<View className="absolute bottom-0 left-0 right-0 p-4">
				<Text
					className="text-white font-bold text-lg leading-6 shadow-sm"
					numberOfLines={2}
				>
					{name}
				</Text>
				<View className="flex-row items-center justify-between mt-2">
					<View className="flex-row items-center gap-2">
						<Text className="text-white/90 text-xs font-medium">
							{(recipe.kcalPerServing ?? recipe.kcalPer100g) + " kcal"}
						</Text>
						<Text className="text-white/60 text-xs">•</Text>
						<Text
							className="text-xs font-bold"
							style={{ color: difficultyColor }}
						>
							{difficultyLabel}
						</Text>
					</View>
					<View className="bg-white/20 p-1.5 rounded-full">
						<Text className="text-xs text-white">➜</Text>
					</View>
				</View>
			</View>
		</Pressable>
	);
}
