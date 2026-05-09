import { Stack } from "expo-router";
import { useApp } from "../../lib/context";

export default function OnboardingLayout() {
  const { theme } = useApp();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: "slide_from_right",
      }}
    />
  );
}
