import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [successArgs, setSuccessArgs] = useState<{ email: string } | null>(
    null,
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    // IMPORTANT: redirect explicitly to deep link for Reset Password screen
    // Scheme is 'nutriplanit' as defined in app.json for dev build
    // For local development it might look different but sticking to custom scheme is safer for EAS builds
    const redirectTo = "nutriplanit://auth/callback?next=/auth/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Errore", error.message);
    } else {
      setSuccessArgs({ email: data.email });
    }
  };

  if (successArgs) {
    return (
      <View
        className="flex-1 bg-white px-6 justify-center items-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="bg-green-100 p-4 rounded-full mb-6">
          <Text className="text-4xl">📧</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Controlla la tua email
        </Text>
        <Text className="text-gray-600 text-center mb-8 leading-6">
          Abbiamo inviato un link di reset password a{"\n"}
          <Text className="font-semibold text-gray-900">
            {successArgs.email}
          </Text>
          .{"\n"}Clicca sul link per impostare una nuova password.
        </Text>

        <Link href="/(auth)/login" asChild>
          <Pressable className="w-full bg-primary-500 py-4 rounded-xl">
            <Text className="text-white text-center text-lg font-semibold">
              Torna al Login
            </Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
    >
      <View className="mb-8">
        <Link href="/(auth)/login" asChild>
          <Pressable className="mb-4">
            <Text className="text-primary-600 font-medium">← Indietro</Text>
          </Pressable>
        </Link>
        <Text className="text-2xl font-bold text-gray-900">
          Password dimenticata?
        </Text>
        <Text className="text-gray-500 mt-2">
          Inserisci la tua email e ti invieremo le istruzioni per reimpostare la
          password.
        </Text>
      </View>

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

      <Pressable
        className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-6 ${loading ? "opacity-70" : ""
          }`}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text className="text-white text-center text-lg font-semibold">
          {loading ? "Invio in corso..." : "Invia Link Reset"}
        </Text>
      </Pressable>
    </View>
  );
}
