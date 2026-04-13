import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/context";
import { useKeepAwake } from "expo-keep-awake";

function Inner() {
  const { data, theme } = useApp();
  if (data.settings.preventSleep) {
    useKeepAwake();
  }
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
