import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../../lib/context";
import { ProgramId } from "../../lib/programs";
import { spacing, borderRadius } from "../../constants/theme";

// One-line, per-program reassurance shown at the top of each workout screen:
// the values entered at onboarding are not locked in. Dismissible, and the
// dismissal persists per program (a user who clears it on 5/3/1 still sees it
// the first time they open a different program's screen).
const NOTE_COPY: Record<ProgramId, string> = {
  wendler531: "Your 1RMs can be adjusted anytime in Settings.",
  startingStrength: "Your starting weights can be adjusted anytime in Settings.",
  texasMethod: "Your starting values can be adjusted anytime in Settings.",
};

const storageKey = (programId: ProgramId) =>
  `workout-screen-${programId}-starting-weights-note-dismissed`;

export function StartingWeightsNote({ programId }: { programId: ProgramId }) {
  const { theme } = useApp();
  // null = AsyncStorage read still pending (render nothing to avoid a flash),
  // true = show the note, false = already dismissed.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey(programId))
      .then((v) => {
        if (active) setVisible(v !== "1");
      })
      .catch(() => {
        if (active) setVisible(true);
      });
    return () => {
      active = false;
    };
  }, [programId]);

  if (visible !== true) return null;

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(storageKey(programId), "1").catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>{NOTE_COPY[programId]}</Text>
      <TouchableOpacity
        onPress={dismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss note"
      >
        <Ionicons name="close" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm + 4,
  },
  text: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});
