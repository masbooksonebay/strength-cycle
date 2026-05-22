import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../../lib/context";
import { generateId, SetLog, WorkoutLog } from "../../../lib/store";
import { formatWeight } from "../../../lib/plates";
import {
  TM_DAYS,
  TM_LIFTS,
  TmDay,
  TmLift,
  TMStallChoice,
  advanceWeekIndex,
  applyIntensityDayProgression,
  getCurrentFiveRM,
  getDaySets,
  mainUpperLiftForWeek,
  resolveStallChoice,
} from "../../../lib/programs/texasMethod";
import { spacing, borderRadius } from "../../../constants/theme";
import { TimerPill, TimerStartButton } from "../../../components/TimerPill";
import { StartingWeightsNote } from "../../../components/workout/StartingWeightsNote";
import { useTimer } from "../../../lib/timer";
import { DoneKeyboardToolbar } from "../../../components/common/DoneKeyboardToolbar";
import { SheetBackdrop } from "../../../components/common/SheetBackdrop";

// Mon=Volume, Wed=Recovery, Fri=Intensity. Other days default to Volume so the
// app never opens to an empty screen. User tap on the day selector overrides
// for the session (does not persist).
function defaultDayForToday(): TmDay {
  const dow = new Date().getDay();
  if (dow === 1) return "volume";
  if (dow === 3) return "recovery";
  if (dow === 5) return "intensity";
  return "volume";
}

function dayPhaseLabel(day: TmDay): string {
  if (day === "volume") return "Volume Day";
  if (day === "recovery") return "Recovery Day";
  return "Intensity Day";
}

export default function TexasMethodWorkoutScreen() {
  const { data, theme, addWorkout, updateTexasMethodState } = useApp();
  const timer = useTimer();
  const tm = data.programs.texasMethod;
  const s = data.settings;
  const units = s.units;
  const unitLabel = units === "lb" ? "lbs" : "kg";

  const [day, setDay] = useState<TmDay>(defaultDayForToday);
  const mainUpper = mainUpperLiftForWeek(tm.weekIndex);

  // Lifts shown for the selected day (filter to those with non-empty
  // prescription so off-week upper-body / off-day lifts don't render).
  const liftsToShow = useMemo<TmLift[]>(() => {
    return TM_LIFTS.filter((lift) => {
      const sets = getDaySets({
        day,
        lift,
        state: tm,
        lifts: data.lifts,
        precision: s.precision,
        rounding: s.rounding,
      });
      return sets.length > 0;
    });
  }, [day, tm, data.lifts, s.precision, s.rounding]);

  const showPowerClean = day === "volume" && tm.powerCleanEnabled;

  // Log modal: which lift the user is logging, and the actual reps achieved
  // on the work set. Defaults to 5 (the prescription).
  const [logLift, setLogLift] = useState<TmLift | "PowerClean" | null>(null);
  const [logReps, setLogReps] = useState(5);
  const [logNotes, setLogNotes] = useState("");

  const togglePowerClean = () => {
    updateTexasMethodState({ powerCleanEnabled: !tm.powerCleanEnabled });
  };

  const openLogModal = (lift: TmLift | "PowerClean") => {
    setLogLift(lift);
    // Intensity day = PR attempt; default the rep counter to 5 so a clean
    // PR is one tap of Save. Volume/Recovery prescribe 5s as well.
    setLogReps(5);
    setLogNotes("");
  };

  const closeLogModal = () => {
    setLogLift(null);
    setLogNotes("");
  };

  // Wave 2: the stall prompt's three buttons now funnel through
  // resolveStallChoice, which reads currentWeight from state.pendingStallResolution
  // (set during applyIntensityDayProgression's stall branch). The visual UI is
  // unchanged — same Alert.alert, same three options.
  const handleStallResponse = (choice: TMStallChoice) => {
    const next = resolveStallChoice({
      state: tm,
      choice,
      precision: s.precision,
      rounding: s.rounding,
    });
    updateTexasMethodState(next);
  };

  // Save the work-set log + run program-side progression. Stall alert fires
  // for sub-5 reps on intensity day's PR attempt (Squat or main upper). Volume
  // day deadlift bumps weekly. Intensity day completion advances weekIndex.
  const handleSave = () => {
    if (!logLift) return;
    const lift = logLift;
    const sets = lift === "PowerClean"
      ? [] // Power Clean has no computed prescription; user-driven only.
      : getDaySets({ day, lift, state: tm, lifts: data.lifts, precision: s.precision, rounding: s.rounding });

    const setLogs: SetLog[] = sets.map((set, i) => {
      const isWorkSet = !set.isWarmup;
      const isLastWorkSet = isWorkSet && i === sets.length - 1;
      return {
        percentage: set.percentage,
        weight: set.weight ?? 0,
        targetReps: String(set.reps),
        actualReps: isLastWorkSet ? logReps : Number(set.reps) || 5,
        isAmrap: !!set.isAmrap,
        isWarmup: !!set.isWarmup,
      };
    });

    const workout: WorkoutLog = {
      id: generateId(),
      date: new Date().toISOString(),
      exercise: lift === "PowerClean" ? "Power Clean" : lift,
      week: dayPhaseLabel(day),
      cycle: tm.weekIndex,
      sets: setLogs,
      notes: logNotes,
      program: "texasMethod",
    };
    addWorkout(workout);

    // Program-side progression (skip for Power Clean — accessory only).
    if (lift !== "PowerClean") {
      if (day === "intensity" && (lift === "Squat" || lift === mainUpper)) {
        // Wave 2: applyIntensityDayProgression handles BOTH paths — on stall
        // it persists pendingStallResolution; on success it advances the
        // intensity weight. We then read the `stalled` flag to fire the
        // (visually unchanged) Alert.alert prompt for resolution.
        const fallbackFiveRM = getCurrentFiveRM({
          lifts: data.lifts,
          lift,
          precision: s.precision,
          rounding: s.rounding,
        });
        const currentIntensity = tm.intensityWeights[lift] ?? fallbackFiveRM;
        const result = applyIntensityDayProgression({
          state: tm,
          lift,
          reps: logReps,
          units,
          currentIntensity,
        });
        updateTexasMethodState(result.state);
        if (result.stalled) {
          Alert.alert(
            `${lift} stall`,
            `You logged ${logReps} reps on the work set. Choose how to handle this stall.`,
            [
              { text: "Repeat next week", onPress: () => handleStallResponse("repeat") },
              { text: "Reduce volume 10%", onPress: () => handleStallResponse("cutVolume") },
              { text: "Deload to 85%", onPress: () => handleStallResponse("deload"), style: "destructive" },
            ],
            { cancelable: false },
          );
        }
      }
      // Phase 5E: deadlift no longer auto-progresses on Volume Day. With 1RM as
      // the single source of truth, users advance Deadlift by editing 1RM in
      // Settings (consistent with how every other lift's working weight scales).
    }

    closeLogModal();
  };

  const liftBadge = (lift: TmLift) => {
    if (lift === mainUpper) return "MAIN";
    if (lift === "Bench Press" || lift === "Overhead Press") return "OFF-WEEK";
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH CYCLE</Text>
      </View>
      <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.programName, { color: theme.text }]}>Texas Method</Text>
          <Text style={[styles.weekText, { color: theme.textSecondary }]}>Week {tm.weekIndex}</Text>
        </View>
        <TouchableOpacity
          onPress={togglePowerClean}
          style={[
            styles.powerCleanPill,
            {
              borderColor: tm.powerCleanEnabled ? theme.accent : theme.border,
              backgroundColor: tm.powerCleanEnabled ? theme.accent + "22" : theme.card,
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: tm.powerCleanEnabled }}
        >
          <Ionicons
            name={tm.powerCleanEnabled ? "barbell" : "barbell-outline"}
            size={14}
            color={tm.powerCleanEnabled ? theme.accent : theme.textSecondary}
          />
          <Text
            style={[
              styles.powerCleanText,
              { color: tm.powerCleanEnabled ? theme.accent : theme.textSecondary },
            ]}
          >
            Power Cleans: {tm.powerCleanEnabled ? "On" : "Off"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.daySelector, { borderBottomColor: theme.border }]}>
        {TM_DAYS.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={styles.dayTab}
            onPress={() => setDay(d.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: day === d.id }}
          >
            <Text
              style={[
                styles.dayText,
                { color: d.id === day ? theme.text : theme.textSecondary },
                d.id === day && { fontWeight: "700" },
              ]}
            >
              {d.short}
            </Text>
            {d.id === day && <View style={[styles.dayIndicator, { backgroundColor: theme.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>THIS WEEK</Text>
        <Text style={[styles.bannerValue, { color: theme.accent }]}>{mainUpper}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <StartingWeightsNote programId="texasMethod" />

        {liftsToShow.map((lift) => {
          const sets = getDaySets({
            day,
            lift,
            state: tm,
            lifts: data.lifts,
            precision: s.precision,
            rounding: s.rounding,
          });
          const workSets = sets.filter((set) => !set.isWarmup);
          const topWeight = workSets[workSets.length - 1]?.weight ?? 0;
          const topReps = workSets[workSets.length - 1]?.reps ?? "";
          const totalWorkSets = workSets.length;
          const badge = liftBadge(lift);
          return (
            <View key={lift} style={[styles.liftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.liftHeader}>
                <Text style={[styles.liftName, { color: theme.text }]}>{lift}</Text>
                {badge && (
                  <View style={[styles.badge, { borderColor: theme.accent }]}>
                    <Text style={[styles.badgeText, { color: theme.accent }]}>{badge}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={[styles.liftSummary, { color: theme.textSecondary }]}>
                  {totalWorkSets}×{topReps} @ {formatWeight(topWeight)} {unitLabel}
                </Text>
              </View>

              {sets.map((set, i) => (
                <View key={i} style={[styles.setRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.setPerc, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>
                    {set.percentage}% × {set.reps}
                    {set.isAmrap && <Text style={{ color: theme.accent }}> (PR)</Text>}
                  </Text>
                  <Text style={[styles.setWeight, { color: set.isWarmup ? theme.textSecondary : theme.text }]}>
                    {formatWeight(set.weight ?? 0)} <Text style={styles.unitSm}>{unitLabel}</Text>
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.logBtn, { backgroundColor: theme.accent }]}
                onPress={() => openLogModal(lift)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${lift}`}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.logBtnText}>Log {lift}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {showPowerClean && (
          <View style={[styles.liftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.liftHeader}>
              <Text style={[styles.liftName, { color: theme.text }]}>Power Cleans</Text>
              <View style={[styles.badge, { borderColor: theme.textSecondary }]}>
                <Text style={[styles.badgeText, { color: theme.textSecondary }]}>ACCESSORY</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Text style={[styles.liftSummary, { color: theme.textSecondary }]}>5×3 · your work weight</Text>
            </View>
            <Text style={[styles.accessoryHint, { color: theme.textSecondary }]}>
              Pendlay's Texas Method uses 5×3 power cleans as supplementary explosive work. Pick a weight you can move fast for triples.
            </Text>
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: theme.accent }]}
              onPress={() => openLogModal("PowerClean")}
              accessibilityRole="button"
              accessibilityLabel="Log Power Cleans"
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.logBtnText}>Log Power Cleans</Text>
            </TouchableOpacity>
          </View>
        )}

        {day === "intensity" && (
          <TouchableOpacity
            style={[styles.advanceBtn, { borderColor: theme.border }]}
            onPress={() => updateTexasMethodState(advanceWeekIndex(tm))}
            accessibilityRole="button"
            accessibilityLabel="Advance to next week"
          >
            <Ionicons name="arrow-forward-circle-outline" size={18} color={theme.accent} />
            <Text style={[styles.advanceText, { color: theme.accent }]}>End week — advance to Week {tm.weekIndex + 1}</Text>
          </TouchableOpacity>
        )}

        <TimerStartButton />
        <View style={{ height: timer.visible ? 72 : 8 }} />
      </ScrollView>

      <TimerPill />

      <SheetBackdrop visible={!!logLift} />

      <Modal visible={!!logLift} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeLogModal}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Log {logLift === "PowerClean" ? "Power Cleans" : logLift}
            </Text>
            <TouchableOpacity onPress={closeLogModal} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Day</Text>
            <Text style={[styles.modalValue, { color: theme.text }]}>{dayPhaseLabel(day)} · Week {tm.weekIndex}</Text>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Reps on work set</Text>
            <View style={styles.repCounter}>
              <TouchableOpacity
                onPress={() => setLogReps(Math.max(0, logReps - 1))}
                style={[styles.repBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Decrement reps"
              >
                <Ionicons name="remove" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.repCount, { color: theme.text }]}>{logReps}</Text>
              <TouchableOpacity
                onPress={() => setLogReps(logReps + 1)}
                style={[styles.repBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Increment reps"
              >
                <Ionicons name="add" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {day === "intensity" && (logLift === "Squat" || logLift === mainUpper) && logReps < 5 && (
              <Text style={[styles.warnText, { color: theme.accent }]}>
                Sub-5 reps on the PR set will trigger the stall response prompt.
              </Text>
            )}

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: spacing.lg }]}>Notes</Text>
            <DoneKeyboardToolbar
              style={[styles.notesInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
              placeholder="Optional notes..."
              placeholderTextColor={theme.textSecondary}
              multiline
              value={logNotes}
              onChangeText={setLogNotes}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save log"
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: { alignItems: "center", paddingTop: 52, paddingBottom: spacing.xs + 2 },
  brandText: { fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  brandLine: { width: "100%", height: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  programName: { fontSize: 20, fontWeight: "800" },
  weekText: { fontSize: 12, fontWeight: "600", marginTop: 2, letterSpacing: 0.4 },
  powerCleanPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  powerCleanText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  daySelector: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: spacing.sm },
  dayTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, position: "relative" },
  dayText: { fontSize: 12, fontWeight: "500", letterSpacing: 0.5 },
  dayIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 3, borderRadius: 2 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  bannerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  bannerValue: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  content: { padding: spacing.md, paddingTop: spacing.sm + 2 },
  liftCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm + 4,
    overflow: "hidden",
  },
  liftHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  liftName: { fontSize: 16, fontWeight: "800" },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  liftSummary: { fontSize: 12, fontWeight: "600" },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  setPerc: { fontSize: 13, fontWeight: "600" },
  setWeight: { fontSize: 16, fontWeight: "800" },
  unitSm: { fontSize: 11, fontWeight: "500" },
  accessoryHint: { fontSize: 12, lineHeight: 18, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  logBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    margin: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  logBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  advanceBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    marginBottom: spacing.sm + 4,
  },
  advanceText: { fontSize: 13, fontWeight: "700" },
  modalContainer: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", flex: 1 },
  modalContent: { padding: spacing.lg },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  modalValue: { fontSize: 18, fontWeight: "700" },
  repCounter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  repBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  repCount: { fontSize: 22, fontWeight: "800", minWidth: 36, textAlign: "center" },
  warnText: { fontSize: 12, marginTop: spacing.sm, fontWeight: "600" },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: { borderRadius: borderRadius.sm, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
