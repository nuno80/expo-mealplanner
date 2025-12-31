import { FAMILY_KEYS, useFamilyMembers } from "@/hooks/useFamilyMembers";
import { deleteFamilyMember } from "@/services/familyMember.service";
import { syncRecipes } from "@/services/sync.service";
import { useAuthStore } from "@/stores/authStore";
import { useFamilyStore } from "@/stores/familyStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, user } = useAuthStore();
  const { data: members = [] } = useFamilyMembers();
  const { selectedMemberId, setSelectedMemberId } = useFamilyStore();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  // Auto-select primary member if none selected
  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      const primary = members.find((m) => m.isPrimary) || members[0];
      setSelectedMemberId(primary.id);
    }
  }, [members, selectedMemberId, setSelectedMemberId]);

  const deleteMutation = useMutation({
    mutationFn: deleteFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAMILY_KEYS.list(user?.id ?? ""),
      });
    },
    onError: (error) => {
      Alert.alert("Errore", "Impossibile eliminare: " + error.message);
    },
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Elimina Membro",
      `Sei sicuro di voler eliminare ${name}? Verranno cancellati anche tutti i suoi dati (peso, piani).`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-6 py-6 bg-white border-b border-gray-100">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Profilo</Text>
          <View className="flex-row items-center space-x-4">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
              <Text className="text-2xl font-bold text-primary-600">
                {user?.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-lg font-semibold text-gray-900">
                {user?.user_metadata?.name || "Utente"}
              </Text>
              <Text className="text-gray-500">{user?.email}</Text>
              <View className="bg-gray-100 self-start px-2 py-0.5 rounded-md mt-1">
                <Text className="text-xs text-gray-600 font-medium">
                  Free Plan
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Family Section */}
        <View className="mt-6 px-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">
              La tua Famiglia
            </Text>
            <Link href="/(modals)/add-member" asChild>
              <Pressable className="bg-primary-50 px-3 py-1.5 rounded-full">
                <Text className="text-primary-600 font-semibold text-sm">
                  + Aggiungi
                </Text>
              </Pressable>
            </Link>
          </View>

          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {members.map((member, index) => (
              <View
                key={member.id}
                className={`p-4 flex-row justify-between items-center ${index < members.length - 1 ? "border-b border-gray-100" : ""
                  }`}
              >
                <View className="flex-row items-center space-x-3">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${member.sex === "male" ? "bg-blue-50" : "bg-pink-50"
                      }`}
                  >
                    <Text className="text-lg">
                      {member.sex === "male" ? "👨" : "👩"}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-semibold text-gray-900">
                      {member.name} {member.isPrimary && "(Tu)"}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {member.targetKcal} kcal · {member.goal}
                    </Text>
                  </View>
                </View>

                {!member.isPrimary && (
                  <Pressable
                    onPress={() => handleDelete(member.id, member.name)}
                    className="p-2"
                  >
                    <Text className="text-red-400 text-xs font-bold">
                      RIMUOVI
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Settings Section */}
        <View className="mt-8 px-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            Impostazioni
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <Pressable className="p-4 border-b border-gray-100 flex-row justify-between">
              <Text className="font-medium text-gray-700">Lingua</Text>
              <Text className="text-gray-400">Italiano</Text>
            </Pressable>
            <Pressable className="p-4 border-b border-gray-100 flex-row justify-between">
              <Text className="font-medium text-gray-700">Unità di misura</Text>
              <Text className="text-gray-400">Metrico (kg, cm)</Text>
            </Pressable>
            <Pressable className="p-4 flex-row justify-between">
              <Text className="font-medium text-amber-600">
                Passa a Premium 💎
              </Text>
              <Text className="text-gray-400">COMING SOON</Text>
            </Pressable>
          </View>
        </View>

        {/* Dev Tools - Admin */}
        {__DEV__ && (
          <View className="mt-8 px-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              🛠️ Dev Tools
            </Text>
            <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Pressable
                className="p-4 flex-row justify-between items-center"
                onPress={async () => {
                  setSeeding(true);
                  try {
                    await syncRecipes();
                    queryClient.invalidateQueries();
                    Alert.alert(
                      "Sincronizzazione",
                      "Ricette sincronizzate con successo dal server!",
                    );
                  } catch (e: any) {
                    Alert.alert("Errore", e.message);
                  } finally {
                    setSeeding(false);
                  }
                }}
                disabled={seeding}
              >
                <Text className="font-medium text-blue-600">
                  Forza Sincronizzazione 🔄
                </Text>
                {seeding ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Text className="text-gray-400">Scarica dati aggiornati</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Logout */}
        <View className="mt-8 px-6 mb-8">
          <Pressable
            className="w-full bg-white py-4 rounded-xl border border-red-100 items-center"
            onPress={signOut}
          >
            <Text className="text-red-600 font-semibold text-lg">Esci</Text>
          </Pressable>
          <Text className="text-center text-gray-400 text-xs mt-4">
            NutriPlanIT v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
