import { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/context";
import { WEEKS, WEEK_SETS, calcWeight, calcE1RM, calcTM } from "../../lib/program";
import { getLastReps, generateId, WorkoutLog, SetLog } from "../../lib/store";
import { calculatePlates, formatPlateBreakdown, formatWeight } from "../../lib/plates";
import { spacing, borderRadius } from "../../constants/theme";
import { TimerPill, TimerStartButton } from "../../components/TimerPill";
import { useTimer } from "../../lib/timer";
import { NumericInputWithDone } from "../../components/common/NumericInputWithDone";
import { TechniqueTipsModal } from "../../components/workout/TechniqueTipsModal";
import { techniqueForLift } from "../../constants/programContent";

export default function WorkoutScreen() {
  const { data, theme, addWorkout, addExtraSet, removeExtraSet, addLift, updateLift, updateSettings } = useApp();
  const timer = useTimer();
  const [liftIdx, setLiftIdx] = useState(0);
  const [weekIdx, setWeekIdx] = useState(0);
  const [logModal, setLogModal] = useState(false);
  const [amrapReps, setAmrapReps] = useState(1);
  const [logNotes, setLogNotes] = useState("");
  const [addLiftModal, setAddLiftModal] = useState(false);
  const [newLiftName, setNewLiftName] = useState("");
  const [rmPillModal, setRmPillModal] = useState(false);
  const [tmPillModal, setTmPillModal] = useState(false);
  const [pillRmInput, setPillRmInput] = useState("");
  const [pillTmInput, setPillTmInput] = useState("");
  const [plateModal, setPlateModal] = useState(false);
  const [plateModalWeight, setPlateModalWeight] = useState<number | null>(null);
  const [plateModalLabel, setPlateModalLabel] = useState<string>("");
  const [techModal, setTechModal] = useState(false);

  const lifts = data.lifts;
  const lift = lifts[liftIdx] || lifts[0];
  const week = WEEKS[weekIdx];
  const programSets = WEEK_SETS[week];
  const s = data.settings;
  const precision = s.precision;
  const rounding = s.rounding;
  const units = s.units;
  const unitLabel = units === "lb" ? "lbs" : "kg";
  const tm = lift.trainingMax ?? calcTM(lift.oneRepMax, s.tmPercentage);
  const extras = data.extraSets[lift.name] || [];

  const swipeLift = (dir: 1 | -1) => {
    const next = liftIdx + dir;
    if (next < 0) setLiftIdx(lifts.length - 1);
    else if (next >= lifts.length) handleAddLiftTap();
    else setLiftIdx(next);
  };

  const handleAddLiftTap = () => {
    if (s.additionalLifts) {
      setAddLiftModal(true);
    } else {
      Alert.alert("Unlock Additional Lifts", "Add custom exercises beyond the 4 main lifts.\n\nUnlock Additional Lifts — $1.99\nOr get all features with PRO Bundle — $4.99", [{ text: "Dismiss", style: "cancel" }, { text: "Unlock" }]);
    }
  };

  const saveNewLift = () => {
    if (!newLiftName.trim()) return;
    addLift({ name: newLiftName.trim(), oneRepMax: 100, notes: "", isCustom: true });
    setNewLiftName("");
    setAddLiftModal(false);
    setLiftIdx(lifts.length);
  };

  const openPlateModal = (weight: number, label: string) => {
    setPlateModalWeight(weight);
    setPlateModalLabel(label);
    setPlateModal(true);
  };

  const openRmPill = () => { setPillRmInput(String(lift.oneRepMax)); setRmPillModal(true); };
  const openTmPill = () => { setPillTmInput(String(tm)); setTmPillModal(true); };

  const saveRmPill = () => {
    const v = parseFloat(pillRmInput);
    if (v > 0) updateLift(lift.name, { oneRepMax: v });
    setRmPillModal(false);
  };

  const saveTmPill = () => {
    const v = parseFloat(pillTmInput);
    if (v > 0) updateLift(lift.name, { trainingMax: v });
    setTmPillModal(false);
  };

  const resetTmOverride = () => {
    updateLift(lift.name, { trainingMax: undefined });
    setTmPillModal(false);
  };

  const lastAmrapSet = programSets.filter((set) => !set.isWarmup).slice(-1)[0];
  const lastAmrapWeight = lastAmrapSet ? calcWeight(tm, lastAmrapSet.percentage, precision, rounding) : 0;
  const e1rm = lastAmrapSet?.isAmrap && amrapReps > 0 ? calcE1RM(lastAmrapWeight, amrapReps) : null;

  const handleLog = () => {
    if (!lastAmrapSet) return;
    const sets: SetLog[] = [{
      percentage: lastAmrapSet.percentage,
      weight: lastAmrapWeight,
      targetReps: String(lastAmrapSet.reps),
      actualReps: amrapReps,
      isAmrap: !!lastAmrapSet.isAmrap,
      isWarmup: false,
    }];
    const workout: WorkoutLog = {
      id: generateId(),
      date: new Date().toISOString(),
      exercise: lift.name,
      week,
      cycle: data.currentCycle,
      sets,
      notes: logNotes,
    };
    addWorkout(workout);
    setLogModal(false);
    setLogNotes("");
    timer.start(s.restTimerDuration);
    Alert.alert("Logged", `${lift.name} — ${week} — ${amrapReps} reps @ ${lastAmrapWeight} ${unitLabel}`);
  };

  const plateResult = useMemo(() => {
    if (plateModalWeight == null) return null;
    return calculatePlates(plateModalWeight, s.barWeight, s.availablePlates, precision, rounding);
  }, [plateModalWeight, s.barWeight, s.availablePlates, precision, rounding]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH CYCLE</Text>
      </View>
      <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => swipeLift(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.liftNameRow}>
            <Text style={[styles.liftName, { color: theme.text }]}>{lift.name}</Text>
            {techniqueForLift(lift.name) && (
              <TouchableOpacity
                onPress={() => setTechModal(true)}
                style={styles.infoBtn}
                hitSlop={10}
                accessibilityLabel={`View technique tips for ${lift.name}`}
                accessibilityRole="button"
              >
                <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.pillRow}>
            <TouchableOpacity onPress={openRmPill} style={[styles.headerPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.headerPillLabel, { color: theme.textSecondary }]}>1RM</Text>
              <Text style={[styles.headerPillValue, { color: theme.text }]}>{lift.oneRepMax}</Text>
              <Text style={[styles.headerPillUnit, { color: theme.textSecondary }]}>{unitLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openTmPill} style={[styles.headerPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.headerPillLabel, { color: theme.textSecondary }]}>TM</Text>
              <Text style={[styles.headerPillValue, { color: theme.accent }]}>{tm}</Text>
              <Text style={[styles.headerPillUnit, { color: theme.textSecondary }]}>{unitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => swipeLift(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
        {WEEKS.map((w, i) => (
          <TouchableOpacity key={w} style={styles.weekTab} onPress={() => setWeekIdx(i)}>
            <Text style={[styles.weekText, { color: i === weekIdx ? theme.text : theme.textSecondary }, i === weekIdx && { fontWeight: "700" }]}>{w === "Deload" ? "DELOAD" : w}</Text>
            {i === weekIdx && <View style={[styles.weekIndicator, { backgroundColor: theme.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {programSets.map((set, i) => {
          const weight = calcWeight(tm, set.percentage, precision, rounding);
          const lastReps = getLastReps(data.workouts, lift.name, week, set.percentage);
          const isLastAmrap = i === programSets.length - 1 && set.isAmrap;
          const plates = calculatePlates(weight, s.barWeight, s.availablePlates, precision, rounding);
          const breakdown = formatPlateBreakdown(plates.plates);
          const breakdownLine = plates.belowBar
            ? "Below bar weight"
            : plates.plates.length === 0
              ? "Bar only"
              : `${breakdown} per side`;
          return (
            <TouchableOpacity key={i} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => openPlateModal(weight, `${set.percentage}% × ${set.reps}`)} activeOpacity={0.7}>
              <View style={styles.setLeft}>
                <Text style={[styles.setPerc, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>
                  {set.percentage}% x{set.reps}
                  {isLastAmrap && <Text style={{ color: theme.accent }}> (AMRAP)</Text>}
                </Text>
                <Text style={[styles.plateLine, { color: theme.textSecondary }]} numberOfLines={1}>{breakdownLine}</Text>
                {lastReps !== null && <Text style={[styles.lastReps, { color: theme.textSecondary }]}>Last: {lastReps} reps</Text>}
              </View>
              <Text style={[styles.setWeight, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>{formatWeight(weight)} <Text style={styles.lbsText}>{unitLabel}</Text></Text>
              <View style={[styles.setBar, { backgroundColor: theme.accent + "30" }]}>
                <View style={[styles.setBarFill, { backgroundColor: theme.accent, width: `${set.percentage}%` }]} />
              </View>
            </TouchableOpacity>
          );
        })}

        {extras.map((es, i) => {
          const weight = calcWeight(tm, es.percentage, precision, rounding);
          const plates = calculatePlates(weight, s.barWeight, s.availablePlates, precision, rounding);
          const breakdown = formatPlateBreakdown(plates.plates);
          const breakdownLine = plates.belowBar
            ? "Below bar weight"
            : plates.plates.length === 0
              ? "Bar only"
              : `${breakdown} per side`;
          return (
            <TouchableOpacity key={`extra-${i}`} style={[styles.setRow, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.7} onPress={() => openPlateModal(weight, `${es.percentage}% × ${es.reps} (added)`)}>
              <View style={styles.setLeft}>
                <Text style={[styles.setPerc, { color: theme.text }]}>{es.percentage}% x{es.reps}</Text>
                <Text style={[styles.plateLine, { color: theme.textSecondary }]} numberOfLines={1}>{breakdownLine}</Text>
                <Text style={[styles.lastReps, { color: theme.accent }]}>Added set</Text>
              </View>
              <Text style={[styles.setWeight, { color: theme.text }]}>{formatWeight(weight)} <Text style={styles.lbsText}>{unitLabel}</Text></Text>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeExtraSet(lift.name, i)}><Ionicons name="close-circle" size={20} color={theme.textSecondary} /></TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={[styles.addSetBtn, { borderColor: theme.border }]} onPress={() => addExtraSet(lift.name, { percentage: programSets[programSets.length - 1]?.percentage || 75, reps: 5 })}>
          <Ionicons name="add" size={18} color={theme.accent} />
          <Text style={[styles.addSetText, { color: theme.accent }]}>Add Set</Text>
        </TouchableOpacity>

        {lastAmrapSet?.isAmrap && (
          <View style={[styles.e1rmCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
            <View style={styles.e1rmTopRow}>
              <Text style={[styles.e1rmLabel, { color: theme.accent }]}>AMRAP REPS</Text>
              <View style={styles.repCounter}>
                <TouchableOpacity onPress={() => setAmrapReps(Math.max(1, amrapReps - 1))} style={[styles.repBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={18} color={theme.text} /></TouchableOpacity>
                <Text style={[styles.repCount, { color: theme.text }]}>{amrapReps}</Text>
                <TouchableOpacity onPress={() => setAmrapReps(amrapReps + 1)} style={[styles.repBtn, { borderColor: theme.border }]}><Ionicons name="add" size={18} color={theme.text} /></TouchableOpacity>
              </View>
            </View>
            {e1rm && <Text style={[styles.e1rmValue, { color: theme.textSecondary }]}>e1RM <Text style={{ color: theme.accent, fontWeight: "800" }}>{e1rm} {unitLabel}</Text></Text>}
          </View>
        )}

        <TouchableOpacity style={[styles.logBtn, { backgroundColor: theme.accent }]} onPress={() => setLogModal(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.logBtnText}>Add to Log</Text>
        </TouchableOpacity>

        <View style={{ marginTop: spacing.sm }}>
          <TimerStartButton />
        </View>

        <View style={{ height: timer.visible ? 72 : 8 }} />
      </ScrollView>

      <TimerPill />

      {/* 1RM Pill Modal */}
      <Modal visible={rmPillModal} transparent animationType="fade" onRequestClose={() => setRmPillModal(false)}>
        <View style={styles.pillOverlay}>
          <View style={[styles.pillCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.pillCardTitle, { color: theme.text }]}>Edit 1RM — {lift.name}</Text>
            <Text style={[styles.pillCardSub, { color: theme.textSecondary }]}>Your estimated one rep max ({unitLabel})</Text>
            <NumericInputWithDone
              style={[styles.pillInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
              value={pillRmInput}
              onChangeText={setPillRmInput}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={saveRmPill}
            />
            <View style={styles.pillBtnRow}>
              <TouchableOpacity onPress={() => setRmPillModal(false)} style={[styles.pillBtn, { borderColor: theme.border }]}><Text style={[styles.pillBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveRmPill} style={[styles.pillBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}><Text style={[styles.pillBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TM Pill Modal */}
      <Modal visible={tmPillModal} transparent animationType="fade" onRequestClose={() => setTmPillModal(false)}>
        <View style={styles.pillOverlay}>
          <View style={[styles.pillCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.pillCardTitle, { color: theme.text }]}>Edit Training Max — {lift.name}</Text>
            <Text style={[styles.pillCardSub, { color: theme.textSecondary }]}>Default: {calcTM(lift.oneRepMax, s.tmPercentage)} {unitLabel} ({s.tmPercentage}% of 1RM)</Text>
            <NumericInputWithDone
              style={[styles.pillInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
              value={pillTmInput}
              onChangeText={setPillTmInput}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={saveTmPill}
            />
            {lift.trainingMax !== undefined && (
              <TouchableOpacity onPress={resetTmOverride} style={styles.pillResetLink}>
                <Text style={[styles.pillResetText, { color: theme.accent }]}>Reset to default ({s.tmPercentage}% of 1RM)</Text>
              </TouchableOpacity>
            )}
            <View style={styles.pillBtnRow}>
              <TouchableOpacity onPress={() => setTmPillModal(false)} style={[styles.pillBtn, { borderColor: theme.border }]}><Text style={[styles.pillBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveTmPill} style={[styles.pillBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}><Text style={[styles.pillBtnText, { color: "#fff" }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
            <Text style={[styles.modalValue, { color: theme.text }]}>{lastAmrapWeight} {unitLabel} ({lastAmrapSet?.percentage}% TM)</Text>
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

      <TechniqueTipsModal visible={techModal} liftName={lift.name} onClose={() => setTechModal(false)} />

      {/* Plate Visual Modal */}
      <Modal visible={plateModal} animationType="fade" transparent>
        <View style={styles.plateOverlay}>
          <View style={[styles.plateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.plateHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plateTitle, { color: theme.text }]}>{plateModalWeight !== null ? formatWeight(plateModalWeight) : ""} {unitLabel}</Text>
                <Text style={[styles.plateSubtitle, { color: theme.textSecondary }]}>{plateModalLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setPlateModal(false)}><Ionicons name="close" size={26} color={theme.text} /></TouchableOpacity>
            </View>

            {plateResult && <BarVisual plates={plateResult.plates} barWeight={s.barWeight} theme={theme} />}

            {plateResult && (
              <View style={styles.plateBody}>
                {plateResult.belowBar ? (
                  <Text style={[styles.plateWarn, { color: theme.textSecondary }]}>Target is below bar weight ({formatWeight(s.barWeight)} {unitLabel}).</Text>
                ) : plateResult.plates.length === 0 ? (
                  <Text style={[styles.plateWarn, { color: theme.textSecondary }]}>Empty bar — no plates needed.</Text>
                ) : (
                  <>
                    <Text style={[styles.plateStat, { color: theme.text }]}>
                      <Text style={{ color: theme.textSecondary }}>Per side: </Text>
                      {formatPlateBreakdown(plateResult.plates)} {unitLabel}
                    </Text>
                    <Text style={[styles.plateStat, { color: theme.textSecondary }]}>
                      Bar {formatWeight(s.barWeight)} + {formatWeight(plateResult.perSide * 2)} in plates · {plateResult.plates.length * 2} plate{plateResult.plates.length * 2 === 1 ? "" : "s"} total
                    </Text>
                    {plateResult.leftover > 0.01 && (
                      <Text style={[styles.plateStat, { color: theme.accent }]}>
                        {formatWeight(plateResult.leftover)} {unitLabel} per side not loadable with current plates
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function plateColor(p: number, theme: any): string {
  if (p >= 45 || p === 20 || p === 25) return theme.accent;
  if (p >= 25 || p === 15) return "#E65A5A";
  if (p >= 10) return "#666666";
  if (p >= 5) return "#888888";
  return "#999999";
}

function plateWidth(p: number): number {
  if (p >= 45 || p >= 20) return 22;
  if (p >= 35 || p >= 15) return 19;
  if (p >= 25) return 17;
  if (p >= 10) return 13;
  if (p >= 5) return 11;
  if (p >= 2.5) return 9;
  return 7;
}

function plateHeight(p: number): number {
  if (p >= 45 || p >= 20) return 80;
  if (p >= 35 || p >= 15) return 70;
  if (p >= 25) return 62;
  if (p >= 10) return 46;
  if (p >= 5) return 36;
  if (p >= 2.5) return 28;
  return 22;
}

function BarVisual({ plates, barWeight, theme }: { plates: number[]; barWeight: number; theme: any }) {
  return (
    <View style={barStyles.wrap}>
      <View style={barStyles.bar}>
        {/* Left plates (largest near collar → largest first from the center outward) */}
        <View style={barStyles.side}>
          <View style={{ flex: 1 }} />
          {[...plates].reverse().map((p, i) => (
            <View key={`L-${i}`} style={{
              width: plateWidth(p),
              height: plateHeight(p),
              backgroundColor: plateColor(p, theme),
              marginHorizontal: 1,
              borderRadius: 2,
            }} />
          ))}
          <View style={[barStyles.collar, { backgroundColor: theme.textSecondary }]} />
        </View>
        {/* Bar */}
        <View style={[barStyles.barShaft, { backgroundColor: theme.textSecondary }]} />
        {/* Right plates */}
        <View style={barStyles.side}>
          <View style={[barStyles.collar, { backgroundColor: theme.textSecondary }]} />
          {plates.map((p, i) => (
            <View key={`R-${i}`} style={{
              width: plateWidth(p),
              height: plateHeight(p),
              backgroundColor: plateColor(p, theme),
              marginHorizontal: 1,
              borderRadius: 2,
            }} />
          ))}
          <View style={{ flex: 1 }} />
        </View>
      </View>
      <Text style={[barStyles.barLabel, { color: theme.textSecondary }]}>Bar · {barWeight}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: spacing.md },
  bar: { flexDirection: "row", alignItems: "center", width: "100%" },
  side: { flex: 1, flexDirection: "row", alignItems: "center" },
  barShaft: { width: 60, height: 8, borderRadius: 2 },
  collar: { width: 5, height: 26, borderRadius: 1, marginHorizontal: 2 },
  barLabel: { fontSize: 11, marginTop: 6, fontWeight: "600", letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: { alignItems: "center", paddingTop: 52, paddingBottom: spacing.xs + 2 },
  brandText: { fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  brandLine: { width: "100%", height: 2 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  arrowBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, alignItems: "center" },
  liftNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liftName: { fontSize: 20, fontWeight: "800" },
  infoBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", opacity: 0.7 },
  tmLabel: { fontSize: 13, fontWeight: "600", marginTop: 1 },
  pillRow: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
  headerPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  headerPillLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  headerPillValue: { fontSize: 15, fontWeight: "800" },
  headerPillUnit: { fontSize: 11, fontWeight: "600" },
  pillOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.xl },
  pillCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, width: "100%", maxWidth: 340 },
  pillCardTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  pillCardSub: { fontSize: 12, marginBottom: spacing.md },
  pillInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, fontSize: 24, fontWeight: "800", textAlign: "center" },
  pillResetLink: { marginTop: spacing.sm, alignItems: "center" },
  pillResetText: { fontSize: 12, fontWeight: "700" },
  pillBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pillBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.sm + 4, alignItems: "center" },
  pillBtnText: { fontSize: 15, fontWeight: "700" },
  weekRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: spacing.sm },
  weekTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, position: "relative" },
  weekText: { fontSize: 12, fontWeight: "500" },
  weekIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 3, borderRadius: 2 },
  content: { padding: spacing.md, paddingTop: spacing.md },
  setRow: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm + 4, borderWidth: 1, flexDirection: "row", alignItems: "center", overflow: "hidden", position: "relative" },
  setLeft: { flex: 1 },
  setPerc: { fontSize: 14, fontWeight: "600" },
  plateLine: { fontSize: 11, marginTop: 2, fontWeight: "500" },
  lastReps: { fontSize: 11, marginTop: 1 },
  setWeight: { fontSize: 20, fontWeight: "800" },
  lbsText: { fontSize: 12, fontWeight: "500" },
  setBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3 },
  setBarFill: { height: 3 },
  removeBtn: { position: "absolute", top: 6, right: 6 },
  addSetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderStyle: "dashed", borderRadius: borderRadius.md, paddingVertical: 10, marginBottom: spacing.sm },
  addSetText: { fontSize: 13, fontWeight: "600" },
  e1rmCard: { borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginTop: spacing.md, borderWidth: 1 },
  e1rmTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  e1rmLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  repCounter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  repBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  repCount: { fontSize: 20, fontWeight: "800", minWidth: 36, textAlign: "center" },
  e1rmValue: { fontSize: 13, fontWeight: "600", marginTop: 2, textAlign: "right" },
  logBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: borderRadius.sm, paddingVertical: 14, marginTop: spacing.lg },
  logBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, paddingTop: 56 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalContent: { padding: spacing.lg },
  modalLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.md },
  modalValue: { fontSize: 18, fontWeight: "700" },
  adjustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  adjBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  adjText: { fontSize: 16, fontWeight: "700" },
  adjInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 24, fontWeight: "800", width: 100, textAlign: "center" },
  adjValue: { fontSize: 24, fontWeight: "800", width: 80, textAlign: "center" },
  previewLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: spacing.sm },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
  previewPerc: { fontSize: 14 },
  previewWeight: { fontSize: 16, fontWeight: "700" },
  notesInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, fontSize: 15, minHeight: 80, textAlignVertical: "top" },
  saveBtn: { borderRadius: borderRadius.sm, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  plateOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: spacing.md },
  plateCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg },
  plateHeader: { flexDirection: "row", alignItems: "flex-start" },
  plateTitle: { fontSize: 28, fontWeight: "900" },
  plateSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  plateBody: { marginTop: spacing.sm },
  plateStat: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  plateWarn: { fontSize: 14, fontWeight: "500", marginTop: spacing.sm, textAlign: "center" },
});
