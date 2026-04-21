import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { WEEKS, WEEK_SETS, calcTM, calcWeight, calcE1RM } from "../../lib/program";
import { generateId, WorkoutLog, SetLog } from "../../lib/store";
import { spacing, borderRadius } from "../../constants/theme";

interface EditableSet {
  percentage: number;
  targetReps: string;
  isWarmup: boolean;
  isAmrap: boolean;
  weight: number;
  actualReps: string;
  done: boolean;
}

export function CurrentSubview() {
  const { data, theme, addWorkout } = useApp();
  const s = data.settings;
  const unitLabel = s.units === "lb" ? "lbs" : "kg";
  const [liftIdx, setLiftIdx] = useState(0);
  const [weekIdx, setWeekIdx] = useState(0);
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<EditableSet[]>([]);

  const lifts = data.lifts;
  const lift = lifts[liftIdx] || lifts[0];
  const week = WEEKS[weekIdx];
  const programSets = WEEK_SETS[week];
  const tm = lift.trainingMax ?? calcTM(lift.oneRepMax, s.tmPercentage);

  useEffect(() => {
    setSets(programSets.map((ps) => ({
      percentage: ps.percentage,
      targetReps: String(ps.reps),
      isWarmup: ps.isWarmup,
      isAmrap: ps.isAmrap,
      weight: calcWeight(tm, ps.percentage, s.precision, s.rounding),
      actualReps: "",
      done: false,
    })));
  }, [liftIdx, weekIdx, lift.oneRepMax, lift.trainingMax, s.tmPercentage, s.precision, s.rounding]);

  const updateSet = (i: number, patch: Partial<EditableSet>) => {
    setSets((prev) => prev.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  };

  const bumpAmrap = (i: number, delta: number) => {
    const current = parseInt(sets[i].actualReps, 10) || 0;
    const next = Math.max(0, current + delta);
    updateSet(i, { actualReps: String(next), done: next > 0 });
  };

  const amrapIdx = sets.findIndex((x) => x.isAmrap);
  const amrapSet = amrapIdx >= 0 ? sets[amrapIdx] : null;
  const amrapReps = amrapSet ? parseInt(amrapSet.actualReps, 10) || 0 : 0;
  const e1rm = amrapSet && amrapReps > 0 ? calcE1RM(amrapSet.weight, amrapReps) : null;

  const handleSave = () => {
    const loggedSets: SetLog[] = sets
      .filter((x) => x.done || (parseInt(x.actualReps, 10) || 0) > 0)
      .map((x) => ({
        percentage: x.percentage,
        weight: x.weight,
        targetReps: x.targetReps,
        actualReps: parseInt(x.actualReps, 10) || 0,
        isAmrap: x.isAmrap,
        isWarmup: x.isWarmup,
      }));
    if (loggedSets.length === 0) {
      Alert.alert("No sets logged", "Enter reps on at least one set before saving.");
      return;
    }
    const workout: WorkoutLog = {
      id: generateId(),
      date: new Date().toISOString(),
      exercise: lift.name,
      week,
      cycle: data.currentCycle,
      sets: loggedSets,
      notes: notes.trim(),
    };
    addWorkout(workout);
    setNotes("");
    setSets((prev) => prev.map((x) => ({ ...x, actualReps: "", done: false })));
    Alert.alert("Saved", `${lift.name} — ${week} — ${loggedSets.length} set${loggedSets.length === 1 ? "" : "s"} logged to Cycle ${data.currentCycle}.`);
  };

  const swipeLift = (dir: 1 | -1) => {
    const next = liftIdx + dir;
    if (next < 0) setLiftIdx(lifts.length - 1);
    else if (next >= lifts.length) setLiftIdx(0);
    else setLiftIdx(next);
  };

  if (lifts.length === 0) {
    return <View style={styles.empty}><Text style={{ color: theme.textSecondary }}>Pick a lift and week above to log</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => swipeLift(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.liftName, { color: theme.text }]}>{lift.name}</Text>
          <Text style={[styles.tmLabel, { color: theme.accent }]}>Cycle {data.currentCycle} · TM {tm} {unitLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => swipeLift(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
        {WEEKS.map((w, i) => (
          <TouchableOpacity key={w} style={styles.weekTab} onPress={() => setWeekIdx(i)}>
            <Text style={[styles.weekText, { color: i === weekIdx ? theme.text : theme.textSecondary }, i === weekIdx && { fontWeight: "800" }]}>{w === "Deload" ? "DELOAD" : w}</Text>
            {i === weekIdx && <View style={[styles.weekIndicator, { backgroundColor: theme.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {sets.map((st, i) => {
        if (st.isAmrap) {
          return (
            <View key={i} style={[styles.amrapCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
              <View style={styles.amrapHeader}>
                <Text style={[styles.amrapLabel, { color: theme.accent }]}>AMRAP · {st.percentage}% × {st.targetReps}</Text>
                <Text style={[styles.amrapWeight, { color: theme.text }]}>{st.weight} {unitLabel}</Text>
              </View>
              <Text style={[styles.amrapHint, { color: theme.textSecondary }]}>How many reps did you get?</Text>
              <View style={styles.repCounter}>
                <TouchableOpacity onPress={() => bumpAmrap(i, -1)} style={[styles.repBtn, { borderColor: theme.border }]}>
                  <Ionicons name="remove" size={26} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.repCount, { color: theme.text }]}>{amrapReps}</Text>
                <TouchableOpacity onPress={() => bumpAmrap(i, 1)} style={[styles.repBtn, { borderColor: theme.border }]}>
                  <Ionicons name="add" size={26} color={theme.text} />
                </TouchableOpacity>
              </View>
              {e1rm !== null && (
                <Text style={[styles.e1rmText, { color: theme.textSecondary }]}>
                  e1RM: <Text style={{ color: theme.accent, fontWeight: "800" }}>{e1rm} {unitLabel}</Text>
                </Text>
              )}
            </View>
          );
        }
        return (
          <View key={i} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.setLeft}>
              <Text style={[styles.setPerc, { color: st.isWarmup ? theme.textSecondary : theme.text }]}>
                {st.percentage}% × {st.targetReps}{st.isWarmup && <Text style={{ color: theme.textSecondary }}>  warmup</Text>}
              </Text>
              <Text style={[styles.setTarget, { color: theme.textSecondary }]}>Target {st.weight} {unitLabel}</Text>
            </View>
            <TextInput
              style={[styles.repsInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
              value={st.actualReps}
              onChangeText={(t) => updateSet(i, { actualReps: t.replace(/[^0-9]/g, ""), done: parseInt(t, 10) > 0 })}
              placeholder="reps"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
            <TouchableOpacity onPress={() => updateSet(i, { done: !st.done })} style={styles.checkBtn}>
              <Ionicons name={st.done ? "checkmark-circle" : "ellipse-outline"} size={28} color={st.done ? theme.accent : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })}

      <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>NOTES</Text>
      <TextInput
        style={[styles.notesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes..."
        placeholderTextColor={theme.textSecondary}
        multiline
      />

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Save Workout</Text>
      </TouchableOpacity>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  arrowBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, alignItems: "center" },
  liftName: { fontSize: 18, fontWeight: "800" },
  tmLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  weekRow: { flexDirection: "row", borderBottomWidth: 1, marginBottom: spacing.md },
  weekTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, position: "relative" },
  weekText: { fontSize: 12, fontWeight: "600" },
  weekIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 3, borderRadius: 2 },
  setRow: { flexDirection: "row", alignItems: "center", borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  setLeft: { flex: 1 },
  setPerc: { fontSize: 14, fontWeight: "700" },
  setTarget: { fontSize: 11, marginTop: 2 },
  repsInput: { borderWidth: 1, borderRadius: borderRadius.sm, width: 72, paddingHorizontal: spacing.sm, paddingVertical: 8, textAlign: "center", fontSize: 16, fontWeight: "700" },
  checkBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  amrapCard: { borderWidth: 2, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, alignItems: "center" },
  amrapHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  amrapLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  amrapWeight: { fontSize: 18, fontWeight: "800" },
  amrapHint: { fontSize: 12, marginBottom: spacing.sm },
  repCounter: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.sm },
  repBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  repCount: { fontSize: 38, fontWeight: "800", minWidth: 64, textAlign: "center" },
  e1rmText: { fontSize: 13, fontWeight: "600" },
  notesLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, minHeight: 60, fontSize: 14, textAlignVertical: "top" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: borderRadius.sm, paddingVertical: 14, marginTop: spacing.md },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
