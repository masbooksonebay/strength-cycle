import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export default function ProgressScreen() {
  const { data, theme } = useApp();
  const unlocked = data.settings.progressLog;

  if (!unlocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.lockContainer}>
          <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
          <Text style={[styles.lockTitle, { color: theme.text }]}>Progress Log</Text>
          <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>
            Unlock Progress Log to view e1RM and Training Max charts for every lift over time.
          </Text>
          <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.unlockBtnText}>Unlock — $1.99</Text>
          </TouchableOpacity>
          <Text style={[styles.bundleText, { color: theme.textSecondary }]}>
            Or get all features with PRO Bundle — $4.99
          </Text>
        </View>
      </View>
    );
  }

  // Placeholder for unlocked progress charts
  const timeFilters = ["ALL", "1Y", "6M", "3M"];
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.filterRow}>
        {timeFilters.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, { borderColor: theme.border }]}>
            <Text style={[styles.filterText, { color: theme.text }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.chartPlaceholder}>
        <Ionicons name="stats-chart-outline" size={40} color={theme.textSecondary} />
        <Text style={[styles.chartText, { color: theme.textSecondary }]}>Progress charts coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  lockTitle: { fontSize: 24, fontWeight: "800", marginTop: spacing.md },
  lockDesc: { fontSize: 14, textAlign: "center", marginTop: spacing.sm, lineHeight: 20, maxWidth: 280 },
  unlockBtn: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.lg },
  unlockBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bundleText: { fontSize: 12, marginTop: spacing.md },
  filterRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, padding: spacing.md },
  filterBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterText: { fontSize: 13, fontWeight: "600" },
  chartPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  chartText: { fontSize: 14 },
});
