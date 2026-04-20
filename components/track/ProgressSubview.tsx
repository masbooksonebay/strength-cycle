import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export function ProgressSubview() {
  const { data, theme } = useApp();

  if (!data.settings.progressLog) {
    return (
      <ScrollView contentContainerStyle={styles.lockContainer}>
        <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
        <Text style={[styles.lockTitle, { color: theme.text }]}>Progress</Text>
        <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>Unlock Progress to view Estimated 1RM and Training Max charts for every lift, AMRAP rep history, and cycle comparison.</Text>
        <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: theme.accent }]}>
          <Text style={styles.unlockBtnText}>Unlock — $1.99</Text>
        </TouchableOpacity>
        <Text style={[styles.bundleLabel, { color: theme.textSecondary }]}>Or get all features with PRO Bundle — $4.99</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.placeholder, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Ionicons name="stats-chart-outline" size={40} color={theme.textSecondary} />
        <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Charts coming next</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  lockContainer: { alignItems: "center", padding: spacing.xl, paddingTop: 80 },
  lockTitle: { fontSize: 24, fontWeight: "800", marginTop: spacing.md },
  lockDesc: { fontSize: 14, textAlign: "center", marginTop: spacing.sm, lineHeight: 20, maxWidth: 300 },
  unlockBtn: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.md, width: "100%", alignItems: "center" },
  unlockBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bundleLabel: { fontSize: 12, marginTop: spacing.lg },
  placeholder: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.xl, alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  placeholderText: { fontSize: 14, fontWeight: "600" },
});
