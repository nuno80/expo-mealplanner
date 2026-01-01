import { FAMILY_KEYS, useFamilyMember } from "@/hooks/useFamilyMembers";
import {
  calculateTargetKcal,
  calculateTDEE,
  DEFAULT_CALORIE_ADJUSTMENTS,
  type UpdateFamilyMemberInput,
  UpdateFamilyMemberSchema,
} from "@/schemas/familyMember";
import {
  deleteFamilyMember,
  updateFamilyMember,
} from "@/services/familyMember.service";
import { useAuthStore } from "@/stores/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MemberDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: member, isLoading: isLoadingMember } = useFamilyMember(
    id ?? "",
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateFamilyMemberInput>({
    resolver: zodResolver(UpdateFamilyMemberSchema),
    defaultValues: {
      name: "",
      sex: "female",
      activityLevel: "moderate",
      goal: "maintain",
      weightKg: 60,
      heightCm: 165,
      birthYear: 1990,
      calorieAdjustment: 0,
      snacksEnabled: false,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (member) {
      reset({
        name: member.name,
        sex: member.sex,
        activityLevel: member.activityLevel,
        goal: member.goal,
        weightKg: member.weightKg,
        heightCm: member.heightCm,
        birthYear: member.birthYear,
        calorieAdjustment: member.calorieAdjustment,
        snacksEnabled: member.snacksEnabled,
      });
    }
  }, [member, reset]);

  // Live TDEE Calculation
  const [tdeePreview, setTdeePreview] = React.useState({ tdee: 0, target: 0 });
  const watchedValues = watch();

  useEffect(() => {
    const { sex, weightKg, heightCm, birthYear, activityLevel, calorieAdjustment } = watchedValues;

    if (sex && weightKg && heightCm && birthYear && activityLevel) {
      const { tdee } = calculateTDEE({
        sex,
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        birthYear: Number(birthYear),
        activityLevel,
      });

      const adj = calorieAdjustment ?? 0;
      const target = calculateTargetKcal(tdee, adj);
      setTdeePreview({ tdee, target });
    }
  }, [
    watchedValues.sex,
    watchedValues.weightKg,
    watchedValues.heightCm,
    watchedValues.birthYear,
    watchedValues.activityLevel,
    watchedValues.calorieAdjustment,
  ]);

  // Update calorie adjustment when goal changes manually (optional, maybe keep manual control)
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "goal" && value.goal) {
        const adj = DEFAULT_CALORIE_ADJUSTMENTS[value.goal as keyof typeof DEFAULT_CALORIE_ADJUSTMENTS];
        setValue("calorieAdjustment", adj, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateFamilyMemberInput) => {
      if (!id) throw new Error("No member ID");
      return updateFamilyMember(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.all });
      router.back();
      Alert.alert("Salvato", "Modifiche salvate con successo.");
    },
    onError: (error) => {
      Alert.alert("Errore", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_KEYS.all });
      router.back(); // Close modal
    },
    onError: (error) => {
      Alert.alert("Errore", error.message);
    },
  });

  const handleDelete = () => {
    if (member?.isPrimary) {
      Alert.alert("Impossibile", "Non puoi eliminare l'utente principale.");
      return;
    }
    Alert.alert(
      "Elimina Membro",
      `Sei sicuro di voler eliminare ${member?.name}? Verranno cancellati anche tutti i suoi dati.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => id && deleteMutation.mutate(id),
        },
      ],
    );
  };

  const onSubmit = (data: UpdateFamilyMemberInput) => {
    updateMutation.mutate(data);
  };

  if (isLoadingMember) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-primary-600 font-semibold text-lg">Chiudi</Text>
        </Pressable>
        <Text className="text-lg font-bold">Dettagli Membro</Text>
        {member?.isPrimary ? (
          <View className="w-16" />
        ) : (
          <Pressable onPress={handleDelete} className="p-2">
            <Text className="text-red-500 font-semibold text-lg">Elimina</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* TDEE Preview Card */}
        <View className="bg-primary-50 p-4 rounded-2xl mb-8 border border-primary-100">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Fabbisogno (TDEE)</Text>
            <Text className="font-bold text-gray-900">{tdeePreview.tdee} kcal</Text>
          </View>
          <View className="flex-row justify-between items-center pt-2 border-t border-primary-200">
            <Text className="text-primary-800 font-medium">Target Giornaliero</Text>
            <Text className="text-2xl font-black text-primary-600">{tdeePreview.target}</Text>
          </View>
        </View>

        {/* Form Fields - Reusing similar structure to add-member */}
        <View className="space-y-4">
          <View>
            <Text className="text-gray-600 mb-1 font-medium">Nome</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="bg-gray-50 p-4 rounded-xl text-lg border border-gray-200"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.name && <Text className="text-red-500 mt-1">{errors.name.message}</Text>}
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-gray-600 mb-1 font-medium">Sesso</Text>
              <Controller
                control={control}
                name="sex"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row bg-gray-50 rounded-xl p-1 border border-gray-200">
                    <Pressable
                      onPress={() => onChange("male")}
                      className={`flex-1 py-3 rounded-lg ${value === "male" ? "bg-white shadow-sm" : ""}`}
                    >
                      <Text className={`text-center font-semibold ${value === "male" ? "text-primary-600" : "text-gray-400"}`}>Uomo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onChange("female")}
                      className={`flex-1 py-3 rounded-lg ${value === "female" ? "bg-white shadow-sm" : ""}`}
                    >
                      <Text className={`text-center font-semibold ${value === "female" ? "text-primary-600" : "text-gray-400"}`}>Donna</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-gray-600 mb-1 font-medium">Anno Nascita</Text>
              <Controller
                control={control}
                name="birthYear"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl text-lg border border-gray-200 text-center"
                    keyboardType="number-pad"
                    value={String(value)}
                    onChangeText={(t) => onChange(Number(t))}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 mb-1 font-medium">Altezza (cm)</Text>
              <Controller
                control={control}
                name="heightCm"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl text-lg border border-gray-200 text-center"
                    keyboardType="number-pad"
                    value={String(value)}
                    onChangeText={(t) => onChange(Number(t))}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 mb-1 font-medium">Peso (kg)</Text>
              <Controller
                control={control}
                name="weightKg"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl text-lg border border-gray-200 text-center"
                    keyboardType="decimal-pad"
                    value={String(value)}
                    onChangeText={(t) => onChange(Number(t))}
                  />
                )}
              />
            </View>
          </View>

          <View>
            <Text className="text-gray-600 mb-1 font-medium">Attività Fisica</Text>
            <Controller
              control={control}
              name="activityLevel"
              render={({ field: { onChange, value } }) => (
                <View className="space-y-2">
                  {[
                    { label: "Sedentario", val: "sedentary" },
                    { label: "Leggera", val: "light" },
                    { label: "Moderata", val: "moderate" },
                    { label: "Attiva", val: "active" },
                    { label: "Molto Attiva", val: "very_active" },
                  ].map((opt) => (
                    <Pressable
                      key={opt.val}
                      onPress={() => onChange(opt.val)}
                      className={`p-3 rounded-xl border ${value === opt.val ? "bg-primary-50 border-primary-500" : "bg-white border-gray-200"}`}
                    >
                      <Text className={`font-medium ${value === opt.val ? "text-primary-700" : "text-gray-600"}`}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>

          <View className="pt-4 pb-20">
            <Text className="text-gray-600 mb-1 font-medium">Obiettivo</Text>
            <Controller
              control={control}
              name="goal"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row space-x-2">
                  {[
                    { label: "Dimagrire", val: "cut" },
                    { label: "Mantenere", val: "maintain" },
                    { label: "Massa", val: "bulk" },
                  ].map((opt) => (
                    <Pressable
                      key={opt.val}
                      onPress={() => onChange(opt.val)}
                      className={`flex-1 p-3 rounded-xl border items-center ${value === opt.val ? "bg-primary-50 border-primary-500" : "bg-white border-gray-200"}`}
                    >
                      <Text className={`font-semibold ${value === opt.val ? "text-primary-700" : "text-gray-600"}`}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100"
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        <Pressable
          className={`bg-primary-600 py-4 rounded-2xl shadow-sm active:bg-primary-700 ${(!isDirty || updateMutation.isPending) ? "opacity-70" : ""}`}
          onPress={handleSubmit(onSubmit as any)}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">Salva Modifiche</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
