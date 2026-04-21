import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { WorkoutLog } from "../../lib/store";
import { calcE1RM, WEEKS } from "../../lib/program";
import { spacing, borderRadius } from "../../constants/theme";
import { NumericInputWithDone } from "../common/NumericInputWithDone";

export function HistorySubview() {
  const { data, theme, deleteWorkout, updateWorkout } = useApp();
  const unitLabel = data.settings.units === "lb" ? "lbs" : "kg";
  const [liftFilter, setLiftFilter] = useState<string>("All");
  const [cycleFilter, setCycleFilter] = useState<number | "All">("All");
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [detail, setDetail] = useState<WorkoutLog | null>(null);
  const [showLiftPick, setShowLiftPick] = useState(false);
  const [showCyclePick, setShowCyclePick] = useState(false);
  const [showPhasePick, setShowPhasePick] = useState(false);
  const [tagEdit, setTagEdit] = useState<WorkoutLog | null>(null);
  const [tagCycleInput, setTagCycleInput] = useState("");
  const [tagPhase, setTagPhase] = useState<string>("5/5/5");

  const openTagEdit = (w: WorkoutLog) => {
    setTagEdit(w);
    setTagCycleInput(String(w.cycle));
    setTagPhase(w.week);
  };

  const saveTagEdit = () => {
    if (!tagEdit) return;
    const c = parseInt(tagCycleInput, 10);
    const updates: Partial<WorkoutLog> = {};
    if (c > 0 && c !== tagEdit.cycle) updates.cycle = c;
    if (tagPhase !== tagEdit.week) updates.week = tagPhase;
    if (Object.keys(updates).length > 0) updateWorkout(tagEdit.id, updates);
    setTagEdit(null);
  };

  const cycles = useMemo(() => {
    const set = new Set<number>();
    data.workouts.forEach((w) => set.add(w.cycle));
    return Array.from(set).sort((a, b) => b - a);
  }, [data.workouts]);

  const liftOptions = useMemo(() => {
    const names = new Set<string>(data.lifts.map((l) => l.name));
    data.workouts.forEach((w) => names.add(w.exercise));
    return ["All", ...Array.from(names)];
  }, [data.lifts, data.workouts]);

  const filtered = useMemo(() => {
    let list = data.workouts;
    if (liftFilter !== "All") list = list.filter((w) => w.exercise === liftFilter);
    if (cycleFilter !== "All") list = list.filter((w) => w.cycle === cycleFilter);
    if (phaseFilter !== "All") list = list.filter((w) => w.week === phaseFilter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.workouts, liftFilter, cycleFilter, phaseFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const w of filtered) {
      const key = new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      const arr = map.get(key) || [];
      arr.push(w);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  return (
    <View style={styles.container}>
      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setShowLiftPick(true)}>
          <Ionicons name="barbell-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.filterText, { color: theme.text }]}>{liftFilter}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setShowCyclePick(true)}>
          <Ionicons name="repeat-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.filterText, { color: theme.text }]}>{cycleFilter === "All" ? "All cycles" : `Cycle ${cycleFilter}`}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setShowPhasePick(true)}>
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.filterText, { color: theme.text }]}>{phaseFilter === "All" ? "All phases" : phaseFilter}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            {data.workouts.length === 0 ? "No workouts logged yet. Complete a workout from the Current tab." : "No workouts match these filters."}
          </Text>
        ) : (
          Array.from(grouped.entries()).map(([date, workouts]) => (
            <View key={date} style={styles.group}>
              <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>{date}</Text>
              {workouts.map((w) => {
                const topSet = [...w.sets].filter((s) => !s.isWarmup).slice(-1)[0] || w.sets[w.sets.length - 1];
                const amrapSet = w.sets.find((s) => s.isAmrap);
                return (
                  <TouchableOpacity key={w.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setDetail(w)}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardLift, { color: theme.text }]}>{w.exercise}</Text>
                      <TouchableOpacity onPress={() => openTagEdit(w)} style={[styles.tagPill, { borderColor: theme.border, backgroundColor: theme.background }]}>
                        <Text style={[styles.tagPillText, { color: theme.accent }]}>Cycle {w.cycle} · {w.week}</Text>
                      </TouchableOpacity>
                    </View>
                    {topSet && (
                      <Text style={[styles.cardLine, { color: theme.textSecondary }]}>
                        Top set: {topSet.weight} {unitLabel} × {topSet.actualReps} {topSet.isAmrap ? <Text style={{ color: theme.accent, fontWeight: "700" }}>(AMRAP)</Text> : null}
                      </Text>
                    )}
                    {amrapSet && amrapSet !== topSet && (
                      <Text style={[styles.cardLine, { color: theme.accent, fontWeight: "700" }]}>
                        AMRAP: {amrapSet.actualReps} reps @ {amrapSet.weight} {unitLabel}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Lift Picker */}
      <Modal visible={showLiftPick} transparent animationType="fade" onRequestClose={() => setShowLiftPick(false)}>
        <TouchableOpacity style={styles.pickOverlay} activeOpacity={1} onPress={() => setShowLiftPick(false)}>
          <View style={[styles.pickCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {liftOptions.map((n) => (
              <TouchableOpacity key={n} style={[styles.pickRow, { borderBottomColor: theme.border }, liftFilter === n && { backgroundColor: theme.accent + "20" }]} onPress={() => { setLiftFilter(n); setShowLiftPick(false); }}>
                <Text style={[styles.pickText, { color: liftFilter === n ? theme.accent : theme.text, fontWeight: liftFilter === n ? "800" : "500" }]}>{n}</Text>
                {liftFilter === n && <Ionicons name="checkmark" size={18} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cycle Picker */}
      <Modal visible={showCyclePick} transparent animationType="fade" onRequestClose={() => setShowCyclePick(false)}>
        <TouchableOpacity style={styles.pickOverlay} activeOpacity={1} onPress={() => setShowCyclePick(false)}>
          <View style={[styles.pickCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={[styles.pickRow, { borderBottomColor: theme.border }, cycleFilter === "All" && { backgroundColor: theme.accent + "20" }]} onPress={() => { setCycleFilter("All"); setShowCyclePick(false); }}>
              <Text style={[styles.pickText, { color: cycleFilter === "All" ? theme.accent : theme.text, fontWeight: cycleFilter === "All" ? "800" : "500" }]}>All cycles</Text>
              {cycleFilter === "All" && <Ionicons name="checkmark" size={18} color={theme.accent} />}
            </TouchableOpacity>
            {cycles.map((c) => (
              <TouchableOpacity key={c} style={[styles.pickRow, { borderBottomColor: theme.border }, cycleFilter === c && { backgroundColor: theme.accent + "20" }]} onPress={() => { setCycleFilter(c); setShowCyclePick(false); }}>
                <Text style={[styles.pickText, { color: cycleFilter === c ? theme.accent : theme.text, fontWeight: cycleFilter === c ? "800" : "500" }]}>Cycle {c}</Text>
                {cycleFilter === c && <Ionicons name="checkmark" size={18} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Phase Picker */}
      <Modal visible={showPhasePick} transparent animationType="fade" onRequestClose={() => setShowPhasePick(false)}>
        <TouchableOpacity style={styles.pickOverlay} activeOpacity={1} onPress={() => setShowPhasePick(false)}>
          <View style={[styles.pickCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {(["All", ...WEEKS] as const).map((p) => {
              const label = p === "All" ? "All phases" : p;
              const active = phaseFilter === p;
              return (
                <TouchableOpacity key={p} style={[styles.pickRow, { borderBottomColor: theme.border }, active && { backgroundColor: theme.accent + "20" }]} onPress={() => { setPhaseFilter(p); setShowPhasePick(false); }}>
                  <Text style={[styles.pickText, { color: active ? theme.accent : theme.text, fontWeight: active ? "800" : "500" }]}>{label}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tag Edit Modal */}
      <Modal visible={tagEdit !== null} transparent animationType="fade" onRequestClose={() => setTagEdit(null)}>
        <KeyboardAvoidingView style={styles.tagOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.tagCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.tagTitle, { color: theme.text }]}>Edit cycle & phase</Text>
            {tagEdit && <Text style={[styles.tagSub, { color: theme.textSecondary }]}>{tagEdit.exercise} · {new Date(tagEdit.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>}

            <Text style={[styles.tagLabel, { color: theme.textSecondary }]}>CYCLE</Text>
            <NumericInputWithDone
              style={[styles.tagInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
              value={tagCycleInput}
              onChangeText={(t) => setTagCycleInput(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.tagLabel, { color: theme.textSecondary }]}>PHASE</Text>
            <View style={styles.tagPhaseRow}>
              {WEEKS.map((w) => (
                <TouchableOpacity key={w} onPress={() => setTagPhase(w)} style={[styles.tagPhaseBtn, { borderColor: theme.border }, tagPhase === w && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                  <Text style={[styles.tagPhaseText, { color: tagPhase === w ? "#fff" : theme.text }]}>{w === "Deload" ? "DELOAD" : w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tagBtnRow}>
              <TouchableOpacity onPress={() => setTagEdit(null)} style={[styles.tagBtn, { borderColor: theme.border }]}><Text style={[styles.tagBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveTagEdit} style={[styles.tagBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}><Text style={[styles.tagBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detail !== null} animationType="slide" presentationStyle="pageSheet">
        {detail && (
          <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>{detail.exercise}</Text>
                <Text style={[styles.detailSub, { color: theme.accent }]}>Cycle {detail.cycle} · {detail.week} · {new Date(detail.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetail(null)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {detail.sets.find((s) => s.isAmrap) && (() => {
                const a = detail.sets.find((s) => s.isAmrap)!;
                const e = calcE1RM(a.weight, a.actualReps);
                return (
                  <View style={[styles.amrapBox, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                    <Text style={[styles.amrapBoxLabel, { color: theme.accent }]}>AMRAP RESULT</Text>
                    <Text style={[styles.amrapBoxValue, { color: theme.text }]}>{a.actualReps} reps</Text>
                    <Text style={[styles.amrapBoxSub, { color: theme.textSecondary }]}>@ {a.weight} {unitLabel} · e1RM {e} {unitLabel}</Text>
                  </View>
                );
              })()}

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ALL SETS</Text>
              {detail.sets.map((s, i) => (
                <View key={i} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.setRowPerc, { color: s.isWarmup ? theme.textSecondary : theme.text }]}>
                      {s.percentage}% × {s.targetReps}{s.isWarmup && <Text style={{ color: theme.textSecondary }}>  warmup</Text>}
                      {s.isAmrap && <Text style={{ color: theme.accent, fontWeight: "800" }}>  AMRAP</Text>}
                    </Text>
                    <Text style={[styles.setRowMeta, { color: theme.textSecondary }]}>{s.weight} {unitLabel}</Text>
                  </View>
                  <Text style={[styles.setRowReps, { color: theme.text }]}>{s.actualReps} reps</Text>
                </View>
              ))}

              {detail.notes && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>NOTES</Text>
                  <Text style={[styles.notesText, { color: theme.text }]}>{detail.notes}</Text>
                </>
              )}

              <TouchableOpacity style={[styles.deleteBtn, { borderColor: theme.border }]} onPress={() => {
                deleteWorkout(detail.id);
                setDetail(null);
              }}>
                <Ionicons name="trash-outline" size={18} color={theme.accent} />
                <Text style={[styles.deleteText, { color: theme.accent }]}>Delete Workout</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  content: { padding: spacing.md },
  empty: { textAlign: "center", marginTop: 60, fontSize: 14 },
  group: { marginBottom: spacing.md },
  dateLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: spacing.sm },
  card: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLift: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 12, fontWeight: "700" },
  tagPill: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  tagPillText: { fontSize: 13, fontWeight: "700" },
  tagOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  tagCard: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg, width: "100%", maxWidth: 340 },
  tagTitle: { fontSize: 17, fontWeight: "800" },
  tagSub: { fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  tagLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.xs },
  tagInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 18, fontWeight: "800", textAlign: "center" },
  tagPhaseRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tagPhaseBtn: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tagPhaseText: { fontSize: 13, fontWeight: "700" },
  tagBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tagBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.sm + 4, alignItems: "center" },
  tagBtnText: { fontSize: 15, fontWeight: "700" },
  cardLine: { fontSize: 13, marginTop: 4 },
  pickOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl },
  pickCard: { borderWidth: 1, borderRadius: borderRadius.md, overflow: "hidden" },
  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 0.5 },
  pickText: { fontSize: 15 },
  detailContainer: { flex: 1 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", padding: spacing.md, paddingTop: 56 },
  detailTitle: { fontSize: 22, fontWeight: "800" },
  detailSub: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  detailContent: { padding: spacing.lg },
  amrapBox: { borderWidth: 2, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: "center", marginBottom: spacing.lg },
  amrapBoxLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: spacing.xs },
  amrapBoxValue: { fontSize: 36, fontWeight: "800" },
  amrapBoxSub: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.sm },
  setRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  setRowPerc: { fontSize: 14, fontWeight: "700" },
  setRowMeta: { fontSize: 12, marginTop: 2 },
  setRowReps: { fontSize: 16, fontWeight: "800" },
  notesText: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.md, marginTop: spacing.lg },
  deleteText: { fontSize: 14, fontWeight: "700" },
});
