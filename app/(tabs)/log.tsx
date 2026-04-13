import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { spacing, borderRadius } from "../../constants/theme";

export default function LogScreen() {
  const { data, theme } = useApp();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");

  const sorted = [...data.log].reverse();
  const filtered = search
    ? sorted.filter(
        (e) =>
          e.exercise.toLowerCase().includes(search.toLowerCase()) ||
          e.week.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  // Group by date for list view
  const grouped: Record<string, typeof sorted> = {};
  for (const entry of filtered) {
    const dateKey = new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(entry);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search log..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode("list")}>
            <Ionicons name="list-outline" size={22} color={viewMode === "list" ? theme.accent : theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode("calendar")}>
            <Ionicons name="calendar-outline" size={22} color={viewMode === "calendar" ? theme.accent : theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            {data.log.length === 0 ? "No workouts logged yet. Complete a workout to see it here." : "No results found."}
          </Text>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>{date}</Text>
              {entries.map((e) => (
                <View key={e.id} style={[styles.logCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.logRow}>
                    <Text style={[styles.logExercise, { color: theme.text }]}>{e.exercise}</Text>
                    <Text style={[styles.logWeek, { color: theme.accent }]}>{e.week}</Text>
                  </View>
                  <View style={styles.logRow}>
                    <Text style={[styles.logDetail, { color: theme.textSecondary }]}>
                      {e.actualReps} reps @ {e.weight} lbs ({e.percentage}%)
                    </Text>
                  </View>
                  {e.notes ? <Text style={[styles.logNotes, { color: theme.textSecondary }]}>{e.notes}</Text> : null}
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, gap: spacing.sm },
  searchRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: spacing.sm },
  viewToggle: { flexDirection: "row", gap: spacing.md },
  content: { padding: spacing.md },
  empty: { textAlign: "center", marginTop: 60, fontSize: 14 },
  dateGroup: { marginBottom: spacing.md },
  dateLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  logCard: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logExercise: { fontSize: 16, fontWeight: "700" },
  logWeek: { fontSize: 13, fontWeight: "600" },
  logDetail: { fontSize: 14, marginTop: 4 },
  logNotes: { fontSize: 12, marginTop: 4, fontStyle: "italic" },
});
