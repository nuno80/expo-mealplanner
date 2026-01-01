import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";

export function PasswordInput(props: TextInputProps) {
	const [isVisible, setIsVisible] = useState(false);

	return (
		<View className="relative">
			<TextInput
				{...props}
				secureTextEntry={!isVisible}
				className={`w-full border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-900 bg-white pr-12 ${props.className}`}
			/>
			<Pressable
				onPress={() => setIsVisible(!isVisible)}
				className="absolute right-0 top-0 bottom-0 justify-center px-4"
				hitSlop={10}
			>
				{isVisible ? (
					<EyeOff size={20} color="#6b7280" />
				) : (
					<Eye size={20} color="#6b7280" />
				)}
			</Pressable>
		</View>
	);
}
