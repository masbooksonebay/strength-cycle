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

// The four barbell lifts seeded at SS onboarding. `key` matches the SSLiftKey
// the finalizer expects; `label` matches the canonical display names used by
// the rest of the app. Phase 2/3 lifts (row / power clean / chin-up) are not
// seeded here — they start at 0 and are introduced in a later stage.
const SS_SETUP_LIFTS = [
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench Press" },
  { key: "deadlift", label: "Deadlift" },
  { key: "press", label: "Overhead Press" },
] as const;

export default function StartingStrengthSetup() {
  const { data, theme, finishStartingStrengthSetup } = useApp();
  const router = useRouter();
  const { return: returnTo } = useLocalSearchParams<{ return?: string }>();
  const fromSettings = returnTo === "settings";
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";

  const [values, setValues] = useState<Record<string, string>>({
    squat: "",
    bench: "",
    deadlift: "",
    press: "",
  });

  // SS working weights are work-set loads, not 1RMs. All four must be a real
  // positive number — a 0 working weight would produce a degenerate first
  // workout — so the Get Started button stays disabled until every field is set.
  const weights = {
    squat: parseFloat(values.squat) || 0,
    bench: parseFloat(values.bench) || 0,
    deadlift: parseFloat(values.deadlift) || 0,
    press: parseFloat(values.press) || 0,
  };
  const allValid =
    weights.squat > 0 && weights.bench > 0 && weights.deadlift > 0 && weights.press > 0;

  const finish = () => {
    if (!allValid) return;
    // finishStartingStrengthSetup seeds programs.startingStrength.workingWeights
    // and leaves `lifts` untouched.
    finishStartingStrengthSetup(weights);
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
          Set your starting weights
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          These are your work-set weights — not a 1RM. Start light: a load you can
          lift for 3 sets of 5 with clean form. It goes up every session.
        </Text>

        {SS_SETUP_LIFTS.map(({ key, label }) => (
          <View key={key} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.labelGroup}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
              <Text style={[styles.rmTag, { color: theme.accent }]}>3×5</Text>
            </View>
            <View style={styles.inputWrap}>
              <NumericInputWithDone
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                value={values[key]}
                onChangeText={(t) => setValues((v) => ({ ...v, [key]: t }))}
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
          style={[styles.btn, { backgroundColor: theme.accent }, !allValid && styles.btnDisabled]}
          onPress={finish}
          disabled={!allValid}
          accessibilityRole="button"
          accessibilityState={{ disabled: !allValid }}
          accessibilityLabel="Get started"
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: spacing.sm, lineHeight: 30 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
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
  helper: { fontSize: 13, lineHeight: 18, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl + 8 },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
