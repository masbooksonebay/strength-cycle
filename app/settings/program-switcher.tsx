import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
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

// "Seeded" = the user has supplied real numbers for this program. 5/3/1 and
// Texas Method share lifts[name].oneRepMax as their single source of truth
// (Phase 5E), so a lift with a non-default 1RM means the user has touched the
// values. Starting Strength is independent — it carries its own workingWeights
// slice and never writes lifts[].oneRepMax — so its seeded signal is startDate,
// which finishStartingStrengthSetup stamps when the SS setup screen is
// submitted. Without this branch a user who had set 1RMs for another program
// would be wrongly treated as having seeded SS and skip the SS setup screen.
function isProgramSeeded(id: ProgramId, data: AppData): boolean {
  if (id === "startingStrength") return data.programs.startingStrength.startDate !== "";
  return data.lifts.some((l) => l.oneRepMax !== 100);
}

export default function ProgramSwitcher() {
  const { data, theme, switchProgram } = useApp();
  const router = useRouter();

  const handleSelect = (id: ProgramId) => {
    if (id === data.activeProgram) return;
    if (isProgramSeeded(id, data)) {
      switchProgram(id);
      // Already-seeded Starting Strength drops the user straight into their next
      // workout; 5/3/1 / TM return to Settings (their existing post-switch path).
      router.replace(id === "startingStrength" ? "/(tabs)" : "/(tabs)/settings");
      return;
    }
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
});
