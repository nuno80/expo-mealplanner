import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Errore", error.message);
    }
    // Redirect gestito da root layout listener
  };

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
    >
      <Text className="text-2xl font-bold text-gray-900 mb-8">Accedi</Text>

      <Text className="text-gray-700 mb-2">Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-900 bg-white"
            placeholder="email@esempio.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.email && (
        <Text className="text-red-500 text-sm mb-3">
          {errors.email.message}
        </Text>
      )}

      <Text className="text-gray-700 mb-2 mt-2">Password</Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-900 bg-white"
            placeholder="••••••••"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.password && (
        <Text className="text-red-500 text-sm mb-4">
          {errors.password.message}
        </Text>
      )}

      <Pressable
        className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-4 ${loading ? "opacity-70" : ""
          }`}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text className="text-white text-center text-lg font-semibold">
          {loading ? "Accesso in corso..." : "Accedi"}
        </Text>
      </Pressable>

      <Link href="/(auth)/signup" asChild>
        <Pressable>
          <Text className="text-primary-600 text-center">
            Non hai un account? Registrati
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
