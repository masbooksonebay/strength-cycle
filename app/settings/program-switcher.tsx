import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { ProgramId, PROGRAMS } from "../../lib/programs";
import { AppData } from "../../lib/store";

const PROGRAM_LIST: ProgramId[] = ["wendler531", "startingStrength", "texasMethod"];


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

// "Configured" = the user has explicitly completed this program's setup
// screen via "Get Started". Reads the per-program setupComplete flag on
// data.programs[id], which finishStartingStrengthSetup / the wendler531 and
// texasMethod setup screens set to true only on Get Started (never on Skip).
//
// Prior versions of this check tried to infer setup from observed lift state
// — e.g., `lift.oneRepMax !== 100`. That heuristic broke when a user
// legitimately had a 1RM of literally 100 (their entered value was
// indistinguishable from the seed default) and when the user left fields
// blank during Get Started (parseFloat("") = NaN → field stayed at 100 →
// every-lift check failed). The explicit boolean flag separates "value
// happens to be present" from "user confirmed setup" and is robust to both.
function isProgramConfigured(data: AppData, id: ProgramId): boolean {
  return data.programs[id].setupComplete === true;
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
