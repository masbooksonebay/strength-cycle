import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { AppProvider, useApp } from "../lib/context";

function Inner() {
  const { data, theme } = useApp();

  // Prevent screen sleep using the idle timer (iOS)
  useEffect(() => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Handled via infoPlist UIIdleTimerDisabled in app.json for iOS
      // For runtime control, a native module would be needed
    }
  }, [data.settings.preventSleep]);

  return (
    <>
      <StatusBar style={data.settings.darkMode ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" />
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
