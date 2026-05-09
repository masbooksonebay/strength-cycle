import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { AppProvider, useApp } from "../lib/context";

function Inner() {
  const { data, theme } = useApp();
  const segments = useSegments();
  const router = useRouter();

  // Prevent screen sleep using the idle timer (iOS)
  useEffect(() => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Handled via infoPlist UIIdleTimerDisabled in app.json for iOS
      // For runtime control, a native module would be needed
    }
  }, [data.settings.preventSleep]);

  // Onboarding gate: first-launch users land in /onboarding; users who have
  // completed onboarding (or are migrating from 1.0.2 with existing data —
  // see store.ts loadData backfill) go straight to (tabs).
  useEffect(() => {
    const inOnboarding = segments[0] === "onboarding";
    if (!data.onboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (data.onboardingComplete && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [data.onboardingComplete, segments, router]);

  return (
    <>
      <StatusBar style={data.settings.darkMode ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="settings/program-switcher" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
