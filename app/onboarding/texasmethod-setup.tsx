import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { NumericInputWithDone } from "../../components/common/NumericInputWithDone";
import { seedTexasMethodState, OnboardingMaxInput } from "../../lib/programs/texasMethod";

const LIFT_NAMES = ["Squat", "Bench Press", "Overhead Press", "Deadlift"] as const;

export default function TexasMethodSetup() {
  const { data, theme, completeOnboarding } = useApp();
  const router = useRouter();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";

  const [oneRMMode, setOneRMMode] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    Squat: "",
    "Bench Press": "",
    "Overhead Press": "",
    Deadlift: "",
  });

  const finish = () => {
    const liftMaxes: Record<string, OnboardingMaxInput> = {};
    for (const name of LIFT_NAMES) {
      const v = parseFloat(values[name]);
      if (v > 0) liftMaxes[name] = { value: v, kind: oneRMMode ? "oneRM" : "fiveRM" };
    }
    const seeded = seedTexasMethodState({ liftMaxes, powerCleanEnabled: false });
    completeOnboarding({
      activeProgram: "texasMethod",
      programs: { ...data.programs, texasMethod: seeded },
    });
    router.replace("/(tabs)");
  };

  const inputLabel = oneRMMode ? "1RM" : "5RM";

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
        <Text style={[styles.title, { color: theme.text }]}>Enter your current {inputLabel}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {oneRMMode
            ? "We'll estimate your 5RM as 85% of your 1RM (reverse Epley)."
            : "Texas Method works from your current 5 rep max — the heaviest 5-rep set you can do today."}
        </Text>

        {LIFT_NAMES.map((name) => (
          <View key={name} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{name}</Text>
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

        <View style={[styles.toggleRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            I only know my 1RM — calculate 5RM for me
          </Text>
          <Switch
            value={oneRMMode}
            onValueChange={setOneRMMode}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Toggle 1RM input mode"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={finish}
          accessibilityRole="button"
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
  title: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
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
  rowLabel: { fontSize: 16, fontWeight: "600", flex: 1 },
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", flex: 1 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl + 8 },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
