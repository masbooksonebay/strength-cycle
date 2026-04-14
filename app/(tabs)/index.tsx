import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { WEEKS, WEEK_SETS, calcWeight, calcE1RM, calcTM } from "../../lib/program";
import { getLastReps, generateId, LogEntry } from "../../lib/store";
import { spacing, borderRadius } from "../../constants/theme";

export default function WorkoutScreen() {
  const { data, theme, addLogEntry, addExtraSet, removeExtraSet, addLift } = useApp();
  const [liftIdx, setLiftIdx] = useState(0);
  const [weekIdx, setWeekIdx] = useState(0);
  const [logModal, setLogModal] = useState(false);
  const [amrapReps, setAmrapReps] = useState(1);
  const [logNotes, setLogNotes] = useState("");
  const [addLiftModal, setAddLiftModal] = useState(false);
  const [newLiftName, setNewLiftName] = useState("");

  const lifts = data.lifts;
  const lift = lifts[liftIdx] || lifts[0];
  const week = WEEKS[weekIdx];
  const programSets = WEEK_SETS[week];
  const precision = data.settings.weightPrecision;
  const tm = calcTM(lift.oneRepMax, data.settings.tmPercentage);
  const extras = data.extraSets[lift.name] || [];

  const swipeLift = (dir: 1 | -1) => {
    const maxIdx = lifts.length; // +1 for the "add" card
    const next = liftIdx + dir;
    if (next < 0) setLiftIdx(lifts.length - 1);
    else if (next >= lifts.length) handleAddLiftTap();
    else setLiftIdx(next);
  };

  const handleAddLiftTap = () => {
    if (data.settings.additionalLifts) {
      setAddLiftModal(true);
    } else {
      Alert.alert(
        "Unlock Additional Lifts",
        "Add custom exercises beyond the 4 main lifts.\n\nUnlock Additional Lifts — $1.99\nOr get all features with PRO Bundle — $4.99",
        [{ text: "Dismiss", style: "cancel" }, { text: "Unlock", style: "default" }]
      );
    }
  };

  const saveNewLift = () => {
    if (!newLiftName.trim()) return;
    addLift({ name: newLiftName.trim(), oneRepMax: 100, notes: "", isCustom: true });
    setNewLiftName("");
    setAddLiftModal(false);
    setLiftIdx(lifts.length); // go to newly added lift
  };

  const lastAmrapSet = programSets.filter((s) => !s.isWarmup).slice(-1)[0];
  const lastAmrapWeight = lastAmrapSet ? calcWeight(tm, lastAmrapSet.percentage, precision) : 0;
  const e1rm = lastAmrapSet?.isAmrap && amrapReps > 0 ? calcE1RM(lastAmrapWeight, amrapReps) : null;

  const handleLog = () => {
    if (!lastAmrapSet) return;
    const entry: LogEntry = {
      id: generateId(), date: new Date().toISOString(), exercise: lift.name, week,
      percentage: lastAmrapSet.percentage, weight: lastAmrapWeight,
      targetReps: String(lastAmrapSet.reps), actualReps: amrapReps, notes: logNotes,
    };
    addLogEntry(entry);
    setLogModal(false);
    setLogNotes("");
    Alert.alert("Logged", `${lift.name} — ${week} — ${amrapReps} reps @ ${lastAmrapWeight} lbs`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Branded header */}
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH</Text>
        <Text style={[styles.brandAccent, { color: theme.accent }]}>CYCLE</Text>
        <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />
      </View>

      {/* Lift header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => swipeLift(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.liftName, { color: theme.text }]}>{lift.name}</Text>
          <Text style={[styles.tmLabel, { color: theme.accent }]}>1RM: {lift.oneRepMax} lbs | TM: {tm} lbs</Text>
        </View>
        <TouchableOpacity onPress={() => swipeLift(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Week tabs */}
      <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
        {WEEKS.map((w, i) => (
          <TouchableOpacity key={w} style={styles.weekTab} onPress={() => setWeekIdx(i)}>
            <Text style={[styles.weekText, { color: i === weekIdx ? theme.text : theme.textSecondary }, i === weekIdx && { fontWeight: "700" }]}>
              {w === "Deload" ? "DELOAD" : w}
            </Text>
            {i === weekIdx && <View style={[styles.weekIndicator, { backgroundColor: theme.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Program sets */}
        {programSets.map((set, i) => {
          const weight = calcWeight(tm, set.percentage, precision);
          const lastReps = getLastReps(data.log, lift.name, week, set.percentage);
          return (
            <View key={i} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.setLeft}>
                <Text style={[styles.setPerc, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>{set.percentage}% x{set.reps}</Text>
                {lastReps !== null && <Text style={[styles.lastReps, { color: theme.textSecondary }]}>Last: {lastReps} reps</Text>}
                {lastReps === null && !set.isWarmup && <Text style={[styles.lastReps, { color: theme.textSecondary }]}>&mdash;</Text>}
              </View>
              <Text style={[styles.setWeight, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>{weight} <Text style={styles.lbsText}>lbs</Text></Text>
              <View style={[styles.setBar, { backgroundColor: theme.accent + "30" }]}>
                <View style={[styles.setBarFill, { backgroundColor: theme.accent, width: `${set.percentage}%` }]} />
              </View>
            </View>
          );
        })}

        {/* Extra sets */}
        {extras.map((es, i) => {
          const weight = calcWeight(tm, es.percentage, precision);
          return (
            <View key={`extra-${i}`} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.setLeft}>
                <Text style={[styles.setPerc, { color: theme.text }]}>{es.percentage}% x{es.reps}</Text>
                <Text style={[styles.lastReps, { color: theme.accent }]}>Added set</Text>
              </View>
              <Text style={[styles.setWeight, { color: theme.text }]}>{weight} <Text style={styles.lbsText}>lbs</Text></Text>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeExtraSet(lift.name, i)}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add set button */}
        <TouchableOpacity
          style={[styles.addSetBtn, { borderColor: theme.border }]}
          onPress={() => addExtraSet(lift.name, { percentage: programSets[programSets.length - 1]?.percentage || 75, reps: 5 })}
        >
          <Ionicons name="add" size={18} color={theme.accent} />
          <Text style={[styles.addSetText, { color: theme.accent }]}>Add Set</Text>
        </TouchableOpacity>

        {/* e1RM display */}
        {lastAmrapSet?.isAmrap && (
          <View style={[styles.e1rmCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
            <Text style={[styles.e1rmLabel, { color: theme.accent }]}>AMRAP REPS</Text>
            <View style={styles.repCounter}>
              <TouchableOpacity onPress={() => setAmrapReps(Math.max(1, amrapReps - 1))} style={[styles.repBtn, { borderColor: theme.border }]}>
                <Ionicons name="remove" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.repCount, { color: theme.text }]}>{amrapReps}</Text>
              <TouchableOpacity onPress={() => setAmrapReps(amrapReps + 1)} style={[styles.repBtn, { borderColor: theme.border }]}>
                <Ionicons name="add" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {e1rm && (
              <Text style={[styles.e1rmValue, { color: theme.text }]}>
                Estimated 1RM (e1RM): <Text style={{ color: theme.accent, fontWeight: "800" }}>{e1rm} lbs</Text>
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.logBtn, { backgroundColor: theme.accent }]} onPress={() => setLogModal(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.logBtnText}>Add to Log</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={logModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log Workout</Text>
            <TouchableOpacity onPress={() => setLogModal(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Exercise</Text>
            <Text style={[styles.modalValue, { color: theme.text }]}>{lift.name}</Text>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Week</Text>
            <Text style={[styles.modalValue, { color: theme.text }]}>{week}</Text>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Weight</Text>
            <Text style={[styles.modalValue, { color: theme.text }]}>{lastAmrapWeight} lbs ({lastAmrapSet?.percentage}% TM)</Text>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Reps (last set)</Text>
            <View style={styles.repCounter}>
              <TouchableOpacity onPress={() => setAmrapReps(Math.max(1, amrapReps - 1))} style={[styles.repBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={24} color={theme.text} /></TouchableOpacity>
              <Text style={[styles.repCount, { color: theme.text }]}>{amrapReps}</Text>
              <TouchableOpacity onPress={() => setAmrapReps(amrapReps + 1)} style={[styles.repBtn, { borderColor: theme.border }]}><Ionicons name="add" size={24} color={theme.text} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: spacing.lg }]}>Notes</Text>
            <TextInput style={[styles.notesInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} placeholder="Optional notes..." placeholderTextColor={theme.textSecondary} multiline value={logNotes} onChangeText={setLogNotes} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleLog}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Lift Modal */}
      <Modal visible={addLiftModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Custom Lift</Text>
            <TouchableOpacity onPress={() => setAddLiftModal(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Lift Name</Text>
            <TextInput style={[styles.notesInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, minHeight: 48 }]} placeholder="e.g. Front Squat" placeholderTextColor={theme.textSecondary} value={newLiftName} onChangeText={setNewLiftName} autoFocus />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={saveNewLift}><Text style={styles.saveBtnText}>Add Lift</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: { alignItems: "center", paddingTop: 56, paddingBottom: spacing.sm },
  brandText: { fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  brandAccent: { fontSize: 16, fontWeight: "800", letterSpacing: 6, marginTop: -2 },
  brandLine: { width: 40, height: 3, borderRadius: 2, marginTop: 6 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  arrowBtn: { padding: spacing.sm },
  headerCenter: { flex: 1, alignItems: "center" },
  liftName: { fontSize: 22, fontWeight: "800" },
  tmLabel: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  weekRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: spacing.sm },
  weekTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm + 4, position: "relative" },
  weekText: { fontSize: 13, fontWeight: "500" },
  weekIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 3, borderRadius: 2 },
  content: { padding: spacing.md },
  setRow: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm + 2, borderWidth: 1, flexDirection: "row", alignItems: "center", overflow: "hidden", position: "relative" },
  setLeft: { flex: 1 },
  setPerc: { fontSize: 15, fontWeight: "600" },
  lastReps: { fontSize: 12, marginTop: 2 },
  setWeight: { fontSize: 22, fontWeight: "800" },
  lbsText: { fontSize: 13, fontWeight: "500" },
  setBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3 },
  setBarFill: { height: 3 },
  removeBtn: { position: "absolute", top: 8, right: 8 },
  addSetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderStyle: "dashed", borderRadius: borderRadius.md, paddingVertical: 12, marginBottom: spacing.sm },
  addSetText: { fontSize: 14, fontWeight: "600" },
  e1rmCard: { borderRadius: borderRadius.md, padding: spacing.lg, marginTop: spacing.sm, borderWidth: 1, alignItems: "center" },
  e1rmLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: spacing.sm },
  repCounter: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  repBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  repCount: { fontSize: 36, fontWeight: "800", minWidth: 60, textAlign: "center" },
  e1rmValue: { fontSize: 16, fontWeight: "600", marginTop: spacing.md },
  logBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: borderRadius.sm, paddingVertical: 16, marginTop: spacing.md },
  logBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, paddingTop: 60 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalContent: { padding: spacing.lg },
  modalLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.md },
  modalValue: { fontSize: 18, fontWeight: "700" },
  notesInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, fontSize: 15, minHeight: 80, textAlignVertical: "top" },
  saveBtn: { borderRadius: borderRadius.sm, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
