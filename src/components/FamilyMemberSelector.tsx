import React, { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import type { FamilyMember } from "@/schemas/familyMember";
import { useFamilyStore } from "@/stores/familyStore";

interface FamilyMemberSelectorProps {
	variant?: "header" | "modal";
	onSelect?: (member: FamilyMember) => void;
}

export function FamilyMemberSelector({
	variant = "header",
	onSelect,
}: FamilyMemberSelectorProps) {
	const insets = useSafeAreaInsets();
	const [isOpen, setIsOpen] = React.useState(false);
	const { data: members = [] } = useFamilyMembers();
	const { selectedMemberId, setSelectedMemberId } = useFamilyStore();

	// Set default selection to primary member if none selected
	useEffect(() => {
		if (!selectedMemberId && members.length > 0) {
			const primary = members.find((m) => m.isPrimary) || members[0];
			setSelectedMemberId(primary.id);
		}
	}, [members, selectedMemberId, setSelectedMemberId]);

	const selectedMember = members.find((m) => m.id === selectedMemberId);

	const handleSelect = (member: FamilyMember) => {
		setSelectedMemberId(member.id);
		onSelect?.(member);
		setIsOpen(false);
	};

	if (variant === "header") {
		return (
			<>
				<Pressable
					onPress={() => setIsOpen(true)}
					className="flex-row items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-full"
				>
					<Text className="font-semibold text-gray-900">
						{selectedMember?.name ?? "Seleziona..."}
					</Text>
					<Text className="text-gray-500 text-xs">▼</Text>
				</Pressable>

				<Modal
					visible={isOpen}
					transparent
					animationType="fade"
					onRequestClose={() => setIsOpen(false)}
				>
					<Pressable
						className="flex-1 bg-black/50"
						onPress={() => setIsOpen(false)}
					>
						<View
							className="absolute bg-white rounded-xl shadow-lg p-2"
							style={{
								top: insets.top + 60,
								left: 20,
								minWidth: 200,
							}}
						>
							{members.map((member) => (
								<Pressable
									key={member.id}
									className={`p-3 rounded-lg flex-row justify-between items-center ${
										member.id === selectedMemberId ? "bg-primary-50" : ""
									}`}
									onPress={() => handleSelect(member)}
								>
									<View>
										<Text className="font-semibold text-gray-900">
											{member.name}
										</Text>
										<Text className="text-xs text-gray-500">
											{member.targetKcal} kcal · {member.goal}
										</Text>
									</View>
									{member.id === selectedMemberId && (
										<Text className="text-primary-600 font-bold">✓</Text>
									)}
								</Pressable>
							))}
						</View>
					</Pressable>
				</Modal>
			</>
		);
	}

	return null; // Implement 'modal' variant if needed later
}
