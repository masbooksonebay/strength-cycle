// Starting Strength — Mark Rippetoe novice linear progression.
//
// Two workouts (A and B) alternate, 3x/week. Tracking is history-based, not
// date-based: if last completed was A (or null on first session), next is B
// (resp. A). Each lift progresses independently — a stall on Squat does not
// affect Press, Bench, or Deadlift increments.
//
// Workout A: Squat 3×5, Press 3×5, Deadlift 1×5
// Workout B: Squat 3×5, Bench 3×5, Deadlift 1×5
//
// Power Clean variant (substituting for Deadlift on Workout B in some printings
// of Practical Programming) is intentionally NOT in scope for 1.0.4. Leaving a
// TODO for potential 1.0.6+ toggle.
// TODO(1.0.6+): optional Power Clean substitution on Workout B (state flag +
// prescription branch). Not in 1.0.4.

import { WeightUnit, roundToPrecision } from "../plates";
import { ProgramMetadata, ProgramSet, StartingStrengthState } from "./types";

export const STARTING_STRENGTH_METADATA: ProgramMetadata = {
  id: "startingStrength",
  displayName: "Starting Strength",
  shortDescription: "Novice linear progression · A/B alternation · 3x/week",
  longDescription:
    "Rippetoe's novice linear progression. Two workouts alternate 3x/week with per-session increments on every lift. Best for true novices building base strength.",
  methodology: "Rippetoe — Starting Strength",
  cycleStructure: "per-session",
  primaryMetricLabel: "Working Weight",
  primaryMetricAbbreviation: "WW",
  setupRoute: "startingstrength-setup",
};

export const SS_LIFTS = ["squat", "press", "bench", "deadlift"] as const;
export type SSLift = (typeof SS_LIFTS)[number];

export type SSWorkout = "A" | "B";

// Display labels for SS lifts. Aligned with the canonical lift names elsewhere
// in the app (5/3/1, TM use "Bench Press", "Overhead Press") so cross-program
// history lookups by name continue to work.
export const SS_LIFT_DISPLAY_NAME: Record<SSLift, string> = {
  squat: "Squat",
  press: "Overhead Press",
  bench: "Bench Press",
  deadlift: "Deadlift",
};

// One prescribed lift inside an SS workout. Mirrors the per-lift ProgramSet[]
// shape used by wendler531 and texasMethod helpers, with the lift identity
// attached because SS workouts contain multiple lifts (unlike the 1-lift-per-day
// 5/3/1 split).
export interface SSLiftPrescription {
  lift: SSLift;
  sets: ProgramSet[];
}

export type SSWorkoutPrescription = SSLiftPrescription[];

// Per-lift result the workout-completion handler needs. targetReps is included
// so callers do not need to re-derive "did the user hit 5?" from the prescription.
export interface SSLiftResult {
  lift: SSLift;
  repsCompleted: number;
  weightLifted: number;
  targetReps: number;
}

export interface SSWorkoutResult {
  workout: SSWorkout;
  lifts: SSLiftResult[];
}

// Workout alternation. First session (lastWorkout === null) is A.
export function getNextWorkout(state: StartingStrengthState): SSWorkout {
  return state.lastWorkout === "A" ? "B" : "A";
}

// Lifts trained in each workout, in the order Rippetoe prescribes.
const WORKOUT_LIFTS: Record<SSWorkout, SSLift[]> = {
  A: ["squat", "press", "deadlift"],
  B: ["squat", "bench", "deadlift"],
};

// Build a ProgramSet entry at 100% of the current working weight. SS does not
// use percentage-of-1RM prescription — every working set is the same absolute
// weight — so percentage=100 represents "100% of working weight" and `weight`
// carries the real number the lifter loads. Warm-up sets are intentionally
// omitted from the prescription in 1.0.4; they'll be added if/when SS gets a
// dedicated workout screen in Wave 3.
function workSet(weight: number, reps: number): ProgramSet {
  return { percentage: 100, reps, isWarmup: false, isAmrap: false, weight };
}

// Rep-scheme-stage → reps-per-set. Wave 2 introduces 5x3 and 5x1 stages that
// fire when a lift can no longer progress at the current rep scheme.
// Canonical Rippetoe terminology preserves the "5x" label (lineage from
// sets-of-5); the actual set count is 3 for Squat/Press/Bench, 1 for Deadlift.
export const SS_REP_SCHEME_STAGES = [5, 3, 1] as const;
export type SSRepSchemeStage = 0 | 1 | 2;

// User-facing label for a stage. Wave 3 UI consumes this; we keep it close to
// the prescription helper so the literal stays in sync with the reps array.
export function repSchemeStageLabel(stage: number): string {
  if (stage === 1) return "5x3";
  if (stage === 2) return "5x1";
  return "5x5";
}

// Build the prescription for a single lift at a given rep-scheme stage. Squat
// and the upper-body lift are 3 sets of N reps; Deadlift is 1 set of N reps
// (low-volume novice canonical — preserved across all stages).
function liftPrescription(lift: SSLift, weight: number, stage: number): SSLiftPrescription {
  const setCount = lift === "deadlift" ? 1 : 3;
  const reps = SS_REP_SCHEME_STAGES[stage] ?? SS_REP_SCHEME_STAGES[0];
  const sets: ProgramSet[] = [];
  for (let i = 0; i < setCount; i++) sets.push(workSet(weight, reps));
  return { lift, sets };
}

export function getWorkoutPrescription(
  workout: SSWorkout,
  state: StartingStrengthState,
): SSWorkoutPrescription {
  return WORKOUT_LIFTS[workout].map((lift) =>
    liftPrescription(lift, state.workingWeights[lift], state.repSchemeStage[lift]),
  );
}

// Per-Rippetoe canonical increments. Squat/Press/Bench follow a two-stage
// schedule: a larger jump until the user's first stall, then a smaller jump
// thereafter. Deadlift has its own three-stage schedule (early-phase taper +
// post-stall drop) because it adds weight ~3x faster than the other lifts and
// needs to taper earlier even without an explicit stall.
const PRE_STALL_INCREMENT: Record<SSLift, Record<WeightUnit, number>> = {
  squat: { lb: 10, kg: 5 },
  press: { lb: 5, kg: 2.5 },
  bench: { lb: 5, kg: 2.5 },
  deadlift: { lb: 15, kg: 7.5 }, // first 6 sessions only
};

const POST_STALL_INCREMENT: Record<SSLift, Record<WeightUnit, number>> = {
  squat: { lb: 5, kg: 2.5 },
  press: { lb: 2.5, kg: 1 },
  bench: { lb: 2.5, kg: 1 },
  deadlift: { lb: 5, kg: 2.5 },
};

// Deadlift's intermediate increment kicks in after 6 sessions, before any
// explicit stall. After the first explicit stall it drops again to POST_STALL.
const DEADLIFT_MID_INCREMENT: Record<WeightUnit, number> = { lb: 10, kg: 5 };
const DEADLIFT_EARLY_PHASE_SESSIONS = 6;

// Settings.units is "lb" | "kg" — same WeightUnit type as the rest of the app.
export function getProgressionIncrement(
  lift: SSLift,
  state: StartingStrengthState,
  unit: WeightUnit,
): number {
  if (lift === "deadlift") {
    // After first explicit stall, drop to the small increment regardless of session count.
    if (state.incrementAdjusted.deadlift) return POST_STALL_INCREMENT.deadlift[unit];
    // Early phase: first 6 sessions get the +15 / +7.5 jump.
    if (state.sessionCount < DEADLIFT_EARLY_PHASE_SESSIONS) return PRE_STALL_INCREMENT.deadlift[unit];
    // Sessions 7+ without a stall: drop to mid increment automatically.
    return DEADLIFT_MID_INCREMENT[unit];
  }
  return state.incrementAdjusted[lift]
    ? POST_STALL_INCREMENT[lift][unit]
    : PRE_STALL_INCREMENT[lift][unit];
}

// Deload rounding: nearest 5 lb / 2.5 kg. Coarser than the user's general
// precision setting so a deload lands on round plate-friendly weights.
const SS_DELOAD_ROUNDING: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };
const SS_DELOAD_MULTIPLIER = 0.9; // 10% off — Rippetoe canonical

// Apply the result of a completed workout. Wave 2 implements the full Rippetoe
// novice stall state machine, per-lift and independent:
//
//   RULE A — first-ever stall on this lift (consecutiveStalls hits 1 and the
//     pre-stall "incrementAdjusted" flag has never flipped before): we flip
//     the flag, dropping subsequent progressions to the smaller post-stall
//     increment. Weight unchanged.
//
//   RULE B — three consecutive stalls on the same lift:
//     - At repSchemeStage 0 or 1 (5x5 or 5x3):
//         · First three-strike cycle at this stage (deloadedAtCurrentStage=false)
//           → DELOAD: workingWeight *= 0.9 (round to 5 lb / 2.5 kg),
//             deloadedAtCurrentStage flips to true, consecutiveStalls resets.
//         · Second three-strike cycle (deloadedAtCurrentStage=true) → drop the
//           rep scheme: 5x5 → 5x3 or 5x3 → 5x1. deloadedAtCurrentStage resets
//           for the fresh stage. Weight unchanged. consecutiveStalls resets.
//     - At repSchemeStage 2 (5x1): graduate trigger — set graduationSuggested
//       so Wave 3's modal can suggest Texas Method. We also flip
//       deloadedAtCurrentStage[lift]=true at stage 2 so the cross-state
//       "5x1 stall cluster on a second lift" check has a flag to read.
//
//   Anything else (consecutiveStalls === 2, etc.) just counts. The user retries
//   the same weight next session.
//
// After processing every lift in the result, we also re-evaluate graduation
// across lifts: if two or more lifts are at stage 2 with the cross-state flag
// set, graduationSuggested is forced true (idempotent — covers the case where
// the user dismissed the prompt after lift A and lift B subsequently joins).
export function completeWorkout(
  state: StartingStrengthState,
  result: SSWorkoutResult,
  unit: WeightUnit,
): StartingStrengthState {
  const nextWorkingWeights = { ...state.workingWeights };
  const nextStallCounts = { ...state.stallCounts };
  const nextIncrementAdjusted = { ...state.incrementAdjusted };
  const nextConsecutiveStalls = { ...state.consecutiveStalls };
  const nextRepSchemeStage = { ...state.repSchemeStage };
  const nextDeloadedAtCurrentStage = { ...state.deloadedAtCurrentStage };
  let nextGraduationSuggested = state.graduationSuggested;

  for (const liftResult of result.lifts) {
    const { lift, repsCompleted, targetReps } = liftResult;
    const hit = repsCompleted >= targetReps;

    if (hit) {
      // Success: reset consecutive stall counter, apply increment for next session.
      nextConsecutiveStalls[lift] = 0;
      const increment = getProgressionIncrement(lift, state, unit);
      nextWorkingWeights[lift] = state.workingWeights[lift] + increment;
      continue;
    }

    // Miss: bump both total (Wave 1 history) and consecutive (Wave 2 trigger) stall counters.
    nextStallCounts[lift] = state.stallCounts[lift] + 1;
    nextConsecutiveStalls[lift] = state.consecutiveStalls[lift] + 1;
    const consec = nextConsecutiveStalls[lift];

    // RULE A — first stall ever on this lift drops the per-session increment.
    if (consec === 1 && !state.incrementAdjusted[lift]) {
      nextIncrementAdjusted[lift] = true;
      continue;
    }

    // RULE B — three consecutive stalls trigger structural transitions.
    if (consec === 3) {
      const stage = state.repSchemeStage[lift];
      if (stage < 2) {
        if (!state.deloadedAtCurrentStage[lift]) {
          // RULE B-i — first three-strike cycle at this stage: deload weight.
          nextWorkingWeights[lift] = roundToPrecision(
            state.workingWeights[lift] * SS_DELOAD_MULTIPLIER,
            SS_DELOAD_ROUNDING[unit],
          );
          nextDeloadedAtCurrentStage[lift] = true;
          nextConsecutiveStalls[lift] = 0;
        } else {
          // RULE B-ii — already deloaded at this stage: drop the rep scheme.
          nextRepSchemeStage[lift] = stage + 1;
          nextDeloadedAtCurrentStage[lift] = false; // fresh stage = fresh deload chance
          nextConsecutiveStalls[lift] = 0;
          // Weight unchanged — lower rep volume buys the user another shot.
        }
      } else {
        // RULE B-iii — stalled out at 5x1: suggest graduation. The flag on
        // deloadedAtCurrentStage at stage 2 is a "5x1 stall cluster fired"
        // marker for the cross-state two-lift check below.
        nextGraduationSuggested = true;
        nextDeloadedAtCurrentStage[lift] = true;
        nextConsecutiveStalls[lift] = 0;
      }
    }
    // consec === 2 (or any other intermediate count): no rule, retry next session.
  }

  // Cross-state: a 5x1 stall cluster recorded on ≥2 distinct lifts → graduate.
  // Re-fires graduationSuggested even if the user previously dismissed, because
  // a second lift hitting the wall is fresh signal that LP is exhausted.
  const fiveXOneClusterCount = SS_LIFTS.filter(
    (l) => nextRepSchemeStage[l] === 2 && nextDeloadedAtCurrentStage[l],
  ).length;
  if (fiveXOneClusterCount >= 2) nextGraduationSuggested = true;

  return {
    lastWorkout: result.workout,
    workingWeights: nextWorkingWeights,
    stallCounts: nextStallCounts,
    incrementAdjusted: nextIncrementAdjusted,
    sessionCount: state.sessionCount + 1,
    consecutiveStalls: nextConsecutiveStalls,
    repSchemeStage: nextRepSchemeStage,
    deloadedAtCurrentStage: nextDeloadedAtCurrentStage,
    graduationSuggested: nextGraduationSuggested,
  };
}

// Convenience reader. Wave 3 modal callers can read state.graduationSuggested
// directly; this helper keeps the surface uniform with dismissGraduationPrompt.
export function checkGraduationTrigger(state: StartingStrengthState): boolean {
  return state.graduationSuggested;
}

// Wave 3 calls this when the user dismisses the Graduate-to-Texas-Method modal.
// Clears the flag but leaves deloadedAtCurrentStage / repSchemeStage intact so
// the cross-state "second lift" trigger can still re-fire later if warranted.
export function dismissGraduationPrompt(state: StartingStrengthState): StartingStrengthState {
  return { ...state, graduationSuggested: false };
}

// Seed a fresh Starting Strength state. Caller supplies the user's entered
// starting weights from the onboarding / Settings program-switch flow. All
// stall counters and increment-adjusted flags start at the un-stalled defaults;
// sessionCount = 0 means the Deadlift early-phase taper is still in effect.
export function initStartingStrengthState(startingWeights: {
  squat: number;
  press: number;
  bench: number;
  deadlift: number;
}): StartingStrengthState {
  return {
    lastWorkout: null,
    workingWeights: { ...startingWeights },
    stallCounts: { squat: 0, press: 0, bench: 0, deadlift: 0 },
    incrementAdjusted: { squat: false, press: false, bench: false, deadlift: false },
    sessionCount: 0,
    consecutiveStalls: { squat: 0, press: 0, bench: 0, deadlift: 0 },
    repSchemeStage: { squat: 0, press: 0, bench: 0, deadlift: 0 },
    deloadedAtCurrentStage: { squat: false, press: false, bench: false, deadlift: false },
    graduationSuggested: false,
  };
}
