import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export default function OnboardingWelcome() {
  const { theme } = useApp();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH CYCLE</Text>
      </View>
      <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Welcome</Text>
        <Text style={[styles.copy, { color: theme.textSecondary }]}>
          Strength Cycle is a multi-program tracker for serious lifters. Choose the program you'll run.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/onboarding/program")}
          accessibilityRole="button"
          accessibilityLabel="Continue to program selection"
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: { alignItems: "center", paddingTop: 52, paddingBottom: spacing.xs + 2 },
  brandText: { fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  brandLine: { width: "100%", height: 2 },
  // Title sits in roughly the top third (paddingTop). Subtitle follows directly.
  // Below is intentional empty space — clean slot for a future custom illustration
  // in 1.0.5 without restructuring this layout.
  content: { flex: 1, alignItems: "center", paddingTop: "18%", paddingHorizontal: spacing.xl },
  title: { fontSize: 56, fontWeight: "900", marginBottom: spacing.md, letterSpacing: 0.5 },
  copy: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl + 8 },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
