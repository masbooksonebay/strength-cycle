import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../../lib/context";
import { generateId, SetLog, WorkoutLog } from "../../../lib/store";
import { formatWeight } from "../../../lib/plates";
import {
  SSLiftKey,
  SSPrescription,
  StartingStrengthState,
  SS_LIFT_DISPLAY_NAME,
  getCurrentWorkoutLifts,
  getWorkoutPrescription,
  registerSetResult,
  completeWorkout,
} from "../../../lib/programs/startingStrength";
import { spacing, borderRadius } from "../../../constants/theme";
import { TimerPill, TimerStartButton } from "../../../components/TimerPill";
import { StartingWeightsNote } from "../../../components/workout/StartingWeightsNote";
import { useTimer } from "../../../lib/timer";

// Per-set local logging state: whether the user tapped the set complete, and
// the actual reps recorded. Non-AMRAP sets default to the prescription target;
// AMRAP sets (chin-ups) default to a placeholder the user steps to their count.
interface SetEntry {
  tapped: boolean;
  reps: number;
}

const AMRAP_DEFAULT_REPS = 5;

function buildSetState(prescriptions: SSPrescription[]): Record<SSLiftKey, SetEntry[]> {
  const out: Partial<Record<SSLiftKey, SetEntry[]>> = {};
  for (const p of prescriptions) {
    out[p.lift] = Array.from({ length: p.sets }, () => ({
      tapped: false,
      reps: p.isAmrap ? AMRAP_DEFAULT_REPS : p.reps,
    }));
  }
  return out as Record<SSLiftKey, SetEntry[]>;
}

export default function StartingStrengthWorkoutScreen() {
  const { data, theme, finishStartingStrengthWorkout } = useApp();
  const timer = useTimer();
  const ss = data.programs.startingStrength;
  const units = data.settings.units;
  const unitLabel = units === "lb" ? "lbs" : "kg";

  // The next workout is the opposite of the last completed one (A on a fresh
  // start). getCurrentWorkoutLifts derives the same letter internally.
  const workoutLetter = ss.lastWorkout === "A" ? "B" : "A";

  const lifts = useMemo(() => getCurrentWorkoutLifts(ss), [ss]);
  const prescriptions = useMemo(
    () => lifts.map((lift) => getWorkoutPrescription(ss, lift)),
    [lifts, ss],
  );

  // Per-set tap state, plus the bookkeeping that resets it when a workout is
  // finished (sessionCount ticks) and surfaces the deload banner.
  const [setState, setSetState] = useState<Record<SSLiftKey, SetEntry[]>>(() =>
    buildSetState(prescriptions),
  );
  const [trackedSession, setTrackedSession] = useState(ss.sessionCount);
  const [prevDeloadHistory, setPrevDeloadHistory] = useState(ss.deloadHistory);
  const [justDeloaded, setJustDeloaded] = useState<SSLiftKey[]>([]);

  // Finishing a workout advances sessionCount. On that tick: diff deloadHistory
  // to find lifts that just deloaded (drives the banner) and reset the per-set
  // tap state for the new workout. Setting state during render is intentional —
  // React discards this pass and re-renders with the fresh state.
  if (trackedSession !== ss.sessionCount) {
    const deloaded = (Object.keys(ss.deloadHistory) as SSLiftKey[]).filter(
      (l) => ss.deloadHistory[l] > prevDeloadHistory[l],
    );
    setJustDeloaded(deloaded);
    setPrevDeloadHistory(ss.deloadHistory);
    setTrackedSession(ss.sessionCount);
    setSetState(buildSetState(prescriptions));
  }

  const toggleSet = (lift: SSLiftKey, idx: number) => {
    setSetState((prev) => ({
      ...prev,
      [lift]: prev[lift].map((s, i) => (i === idx ? { ...s, tapped: !s.tapped } : s)),
    }));
  };

  const adjustReps = (lift: SSLiftKey, idx: number, delta: number) => {
    setSetState((prev) => ({
      ...prev,
      [lift]: prev[lift].map((s, i) =>
        i === idx ? { ...s, reps: Math.max(0, s.reps + delta) } : s,
      ),
    }));
  };

  const isLiftComplete = (lift: SSLiftKey): boolean => {
    const entries = setState[lift];
    return !!entries && entries.length > 0 && entries.every((s) => s.tapped);
  };

  const allComplete = lifts.length > 0 && lifts.every((l) => isLiftComplete(l));

  // Deload banner: lifts in THIS workout that deloaded on the previous session.
  const deloadNames = justDeloaded
    .filter((l) => lifts.includes(l))
    .map((l) => SS_LIFT_DISPLAY_NAME[l]);

  const handleFinish = () => {
    if (!allComplete) return;
    const workouts: WorkoutLog[] = [];
    let nextState: StartingStrengthState = ss;

    for (const p of prescriptions) {
      const entries = setState[p.lift] ?? [];
      // A lift "hit target" when every work set met its prescribed reps. AMRAP
      // lifts (chin-ups) have no pass/fail target — registerSetResult treats
      // them as rep-progression and never deloads them.
      const hitTarget = p.isAmrap || entries.every((s) => s.reps >= p.reps);

      const setLogs: SetLog[] = entries.map((s) => ({
        percentage: 100,
        weight: p.weight,
        targetReps: p.isAmrap ? "AMRAP" : String(p.reps),
        actualReps: s.reps,
        isAmrap: p.isAmrap,
        isWarmup: false,
      }));

      // One WorkoutLog per lift — matches the existing TM convention.
      workouts.push({
        id: generateId(),
        date: new Date().toISOString(),
        exercise: SS_LIFT_DISPLAY_NAME[p.lift],
        week: `Workout ${workoutLetter}`,
        cycle: ss.sessionCount + 1,
        sets: setLogs,
        notes: "",
        program: "startingStrength",
      });

      nextState = registerSetResult(nextState, p.lift, hitTarget, units);
    }

    // allComplete is the didCompleteAllLifts flag — Finish is only enabled once
    // every set of every lift is tapped, so no lift was skipped.
    nextState = completeWorkout(nextState, allComplete);
    finishStartingStrengthWorkout(workouts, nextState);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brandHeader}>
        <Text style={[styles.brandText, { color: theme.text }]}>STRENGTH CYCLE</Text>
      </View>
      <View style={[styles.brandLine, { backgroundColor: theme.accent }]} />

      <View style={styles.headerBlock}>
        <Text style={[styles.programName, { color: theme.text }]}>3x5 Strength</Text>
      </View>

      <View style={[styles.workoutBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.workoutBannerLabel, { color: theme.textSecondary }]}>TODAY</Text>
        <Text style={[styles.workoutBannerValue, { color: theme.accent }]}>Workout {workoutLetter}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <StartingWeightsNote programId="startingStrength" />

        {deloadNames.length > 0 && (
          <View
            style={[styles.deloadBanner, { backgroundColor: theme.accent + "22", borderColor: theme.accent }]}
          >
            <Ionicons name="arrow-down-circle" size={18} color={theme.accent} />
            <Text style={[styles.deloadText, { color: theme.text }]}>
              {deloadNames.join(" & ")} deloaded 10% — keep form sharp, rebuild
            </Text>
          </View>
        )}

        {prescriptions.map((p) => {
          const entries = setState[p.lift] ?? [];
          const complete = isLiftComplete(p.lift);
          return (
            <View
              key={p.lift}
              style={[
                styles.liftCard,
                { backgroundColor: theme.card, borderColor: complete ? theme.accent : theme.border },
              ]}
            >
              <View style={styles.liftHeader}>
                <Text style={[styles.liftName, { color: theme.text }]}>
                  {SS_LIFT_DISPLAY_NAME[p.lift]}
                </Text>
                {complete && (
                  <View style={[styles.loggedBadge, { borderColor: theme.accent }]}>
                    <Ionicons name="checkmark" size={10} color={theme.accent} />
                    <Text style={[styles.loggedBadgeText, { color: theme.accent }]}>LOGGED</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={[styles.liftSummary, { color: theme.textSecondary }]}>
                  {p.isAmrap
                    ? `${p.sets}×AMRAP`
                    : `${p.sets}×${p.reps} @ ${formatWeight(p.weight)} ${unitLabel}`}
                </Text>
              </View>

              {entries.map((entry, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.setRow, { borderTopColor: theme.border }]}
                  onPress={() => toggleSet(p.lift, i)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: entry.tapped }}
                  accessibilityLabel={`${SS_LIFT_DISPLAY_NAME[p.lift]} set ${i + 1}`}
                >
                  <Ionicons
                    name={entry.tapped ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={entry.tapped ? theme.accent : theme.textSecondary}
                  />
                  <Text
                    style={[styles.setWeight, { color: entry.tapped ? theme.text : theme.textSecondary }]}
                  >
                    {p.isAmrap ? "Bodyweight" : `${formatWeight(p.weight)} ${unitLabel}`}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {entry.tapped ? (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => adjustReps(p.lift, i, -1)}
                        style={[styles.stepBtn, { borderColor: theme.border }]}
                        accessibilityRole="button"
                        accessibilityLabel="Decrement reps"
                      >
                        <Ionicons name="remove" size={18} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepReps, { color: theme.text }]}>{entry.reps}</Text>
                      <TouchableOpacity
                        onPress={() => adjustReps(p.lift, i, 1)}
                        style={[styles.stepBtn, { borderColor: theme.border }]}
                        accessibilityRole="button"
                        accessibilityLabel="Increment reps"
                      >
                        <Ionicons name="add" size={18} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepUnit, { color: theme.textSecondary }]}>reps</Text>
                    </View>
                  ) : (
                    <Text style={[styles.setTarget, { color: theme.textSecondary }]}>
                      {p.isAmrap ? "AMRAP" : `${p.reps} reps`}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        <TouchableOpacity
          style={[
            styles.finishBtn,
            {
              backgroundColor: allComplete ? theme.accent : theme.card,
              borderColor: allComplete ? theme.accent : theme.border,
            },
          ]}
          onPress={handleFinish}
          disabled={!allComplete}
          accessibilityRole="button"
          accessibilityLabel="Finish workout"
          accessibilityState={{ disabled: !allComplete }}
        >
          <Ionicons
            name="checkmark-done"
            size={20}
            color={allComplete ? "#fff" : theme.textSecondary}
          />
          <Text
            style={[styles.finishBtnText, { color: allComplete ? "#fff" : theme.textSecondary }]}
          >
            Finish Workout
          </Text>
        </TouchableOpacity>

        <TimerStartButton />
        <View style={{ height: timer.visible ? 72 : 8 }} />
      </ScrollView>

      <TimerPill />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: { alignItems: "center", paddingTop: 52, paddingBottom: spacing.xs + 2 },
  brandText: { fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  brandLine: { width: "100%", height: 2 },
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  programName: { fontSize: 20, fontWeight: "800" },
  workoutBanner: {
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
  workoutBannerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  workoutBannerValue: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  content: { padding: spacing.md, paddingTop: spacing.sm + 2 },
  deloadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm + 4,
  },
  deloadText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
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
  loggedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  loggedBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  liftSummary: { fontSize: 12, fontWeight: "600" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  setWeight: { fontSize: 15, fontWeight: "700" },
  setTarget: { fontSize: 13, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepReps: { fontSize: 16, fontWeight: "800", minWidth: 24, textAlign: "center" },
  stepUnit: { fontSize: 11, fontWeight: "600" },
  finishBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 16,
    marginTop: spacing.xs,
    marginBottom: spacing.sm + 4,
  },
  finishBtnText: { fontSize: 15, fontWeight: "700" },
});
