import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { ProgramId, PROGRAMS } from "../../lib/programs";
import { AppData } from "../../lib/store";

const PROGRAM_LIST: ProgramId[] = ["wendler531", "startingStrength", "texasMethod"];

// The four barbell lifts every program requires data for. Custom lifts the user
// has added (isCustom: true) are not gating — only the four core lifts decide
// whether a switch can skip setup.
const CORE_LIFT_NAMES = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;

// User-facing row title — pulled straight from each program's metadata.
const PROGRAM_ROW_TITLE: Record<ProgramId, string> = {
  wendler531: PROGRAMS.wendler531.displayName,
  texasMethod: PROGRAMS.texasMethod.displayName,
  startingStrength: PROGRAMS.startingStrength.displayName,
};

const PROGRAM_ROW_SUBTITLE: Record<ProgramId, string> = {
  wendler531: PROGRAMS.wendler531.shortDescription,
  texasMethod: PROGRAMS.texasMethod.shortDescription,
  startingStrength: "Linear progression · 3x5 working sets · Workout A/B alternation",
};

// "Configured" = the target program has all the data it needs to start a
// workout without re-prompting. 5/3/1 and Texas Method both run off
// lifts[name].oneRepMax — DEFAULT_LIFTS seeds every 1RM at 100, so all four
// core lifts must read as both > 0 AND != 100 to count as user-entered.
// Starting Strength carries its own workingWeights slice (defaults to 0 for
// all four), populated only at SS setup — all four must be > 0.
//
// Tightened from a prior version that used `.some()` on the 1RM check: even
// one core lift left at the default 100 should still trigger the setup screen
// (5/3/1 generates work-set loads as percentages of each lift's 1RM, so a 100
// default would prescribe nonsense weights for that lift).
function isProgramConfigured(data: AppData, id: ProgramId): boolean {
  if (id === "startingStrength") {
    const ww = data.programs.startingStrength.workingWeights;
    return ww.squat > 0 && ww.bench > 0 && ww.deadlift > 0 && ww.press > 0;
  }
  return CORE_LIFT_NAMES.every((name) => {
    const lift = data.lifts.find((l) => l.name === name);
    return lift !== undefined && lift.oneRepMax > 0 && lift.oneRepMax !== 100;
  });
}

export default function ProgramSwitcher() {
  const { data, theme, switchProgram } = useApp();
  const router = useRouter();

  const handleSelect = (id: ProgramId) => {
    if (id === data.activeProgram) return;
    if (isProgramConfigured(data, id)) {
      // Target program already has its data. Switch in place, return to the
      // Settings screen (not the Workout tab — matches industry convention:
      // Hevy / Strong / Boostcamp / Apple Fitness all keep the user in the
      // settings surface they came from), and show a confirmation alert so
      // the silent state flip is visible. Per-program cycle/week/phase state
      // lives in data.programs.{id} and is left untouched by switchProgram,
      // so each program resumes exactly where it was last left.
      switchProgram(id);
      router.replace("/(tabs)/settings");
      Alert.alert("Switched", `Now training ${PROGRAMS[id].displayName}.`);
      return;
    }
    // Target program has no usable data — run the first-time setup flow.
    // ?return=settings tells the setup screen to land back in Settings (not
    // (tabs)) on completion, preserving the user's modal-from-Settings frame.
    const meta = PROGRAMS[id];
    router.replace(`/onboarding/${meta.setupRoute}?return=settings`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Active Program</Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/settings")} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {PROGRAM_LIST.map((id, i) => {
            const isActive = id === data.activeProgram;
            const isLast = i === PROGRAM_LIST.length - 1;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                onPress={() => handleSelect(id)}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${PROGRAM_ROW_TITLE[id]}${isActive ? ", currently active" : ""}`}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{PROGRAM_ROW_TITLE[id]}</Text>
                  <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>{PROGRAM_ROW_SUBTITLE[id]}</Text>
                </View>
                {isActive && <Ionicons name="checkmark" size={22} color={theme.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.footnote, { color: theme.textSecondary }]}>
          Switching is non-destructive — your data for the other program is preserved and resumes where you left off.
        </Text>
        <Text style={[styles.roadmapNote, { color: theme.textSecondary }]}>
          <Text style={styles.roadmapPrefix}>Coming soon</Text>
          {" — 5/3/1 BBB, GZCLP, nSuns, and more"}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: "800" },
  content: { padding: spacing.md },
  section: { borderRadius: borderRadius.md, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 12, marginTop: 2 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  roadmapNote: { fontSize: 12, lineHeight: 18, marginTop: spacing.sm, paddingHorizontal: spacing.xs, fontStyle: "italic" },
  roadmapPrefix: { fontWeight: "600", fontStyle: "normal" },
});
