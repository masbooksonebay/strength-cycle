import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { NumericInputWithDone } from "../../components/common/NumericInputWithDone";

const LIFT_NAMES = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;

export default function Wendler531Setup() {
  const { data, theme, completeOnboarding } = useApp();
  const router = useRouter();
  const { return: returnTo } = useLocalSearchParams<{ return?: string }>();
  const fromSettings = returnTo === "settings";
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";

  const [values, setValues] = useState<Record<string, string>>({
    Squat: "",
    "Bench Press": "",
    Deadlift: "",
    "Overhead Press": "",
  });

  const finish = (skip: boolean) => {
    const nextLifts = data.lifts.map((l) => {
      if (skip) return l;
      const v = parseFloat(values[l.name]);
      return v > 0 ? { ...l, oneRepMax: v } : l;
    });
    // completeOnboarding sets onboardingComplete=true alongside the patch.
    // Idempotent if already true (the in-app switcher path), so safe to
    // reuse here for both the first-launch and switch-from-settings flows.
    completeOnboarding({ activeProgram: "wendler531", lifts: nextLifts });
    router.replace(fromSettings ? "/(tabs)/settings" : "/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Enter your current 1RM (or estimated 1RM)
        </Text>

        {LIFT_NAMES.map((name) => (
          <View key={name} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.labelGroup}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{name}</Text>
              <Text style={[styles.rmTag, { color: theme.accent }]}>1 RM</Text>
            </View>
            <View style={styles.inputWrap}>
              <NumericInputWithDone
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                value={values[name]}
                onChangeText={(t) => setValues((v) => ({ ...v, [name]: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
              />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>{unitLabel}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.helper, { color: theme.textSecondary }]}>
          You can change these anytime in Settings.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => finish(false)}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => finish(true)} style={styles.skip} accessibilityRole="button">
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip — I'll set later</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: spacing.lg, lineHeight: 30 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  labelGroup: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  rowLabel: { fontSize: 16, fontWeight: "600" },
  rmTag: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  helper: { fontSize: 13, lineHeight: 18, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: "700",
    width: 90,
    textAlign: "center",
  },
  unit: { fontSize: 13, fontWeight: "600" },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl + 8 },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  skip: { marginTop: spacing.md, alignItems: "center" },
  skipText: { fontSize: 14, fontWeight: "600" },
});
