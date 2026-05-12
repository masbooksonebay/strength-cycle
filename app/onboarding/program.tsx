import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";
import { ProgramId, PROGRAMS } from "../../lib/programs";

// PROGRAM_LIST is intentionally narrower than ProgramId in 1.0.4 Wave 1a:
// Starting Strength's onboarding card + setup screen land in Wave 3. The copy
// below is pre-staged so adding "startingStrength" here is a one-line change.
const PROGRAM_LIST: ProgramId[] = ["wendler531", "texasMethod"];

const PROGRAM_LONG_COPY: Record<ProgramId, string> = {
  wendler531:
    "Four-week cycles, AMRAP top sets, training max progression. Best for intermediate lifters who want a sustainable long-term program.",
  texasMethod:
    "Volume / Recovery / Intensity weekly structure with 5RM PR attempts. Best for post-novice lifters ready for harder weekly progression.",
  startingStrength:
    "Rippetoe's novice linear progression. A/B workout alternation, 3x/week, with per-session increments on every lift. Best for true novices building base strength.",
};

export default function ProgramSelect() {
  const { theme } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<ProgramId>("wendler531");

  const continueNext = () => {
    if (selected === "wendler531") router.push("/onboarding/wendler531-setup");
    else router.push("/onboarding/texasmethod-setup");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH CYCLE</Text>
      </View>
      <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Choose your program</Text>

        {PROGRAM_LIST.map((id) => {
          const meta = PROGRAMS[id];
          const isSelected = selected === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? theme.accent : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${meta.displayName} program`}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{meta.displayName}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.accent} />}
              </View>
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{meta.shortDescription}</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{PROGRAM_LONG_COPY[id]}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          You can change your program anytime in Settings.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={continueNext}
          accessibilityRole="button"
          accessibilityLabel={`Continue with ${PROGRAMS[selected].displayName}`}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: "900", marginTop: spacing.md, marginBottom: spacing.lg },
  subtitle: { fontSize: 14, marginBottom: spacing.lg },
  hint: { fontSize: 14, textAlign: "center", marginTop: spacing.sm },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardMeta: { fontSize: 12, fontWeight: "600", marginBottom: spacing.sm, letterSpacing: 0.3 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl + 8 },
  btn: { borderRadius: borderRadius.sm, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
