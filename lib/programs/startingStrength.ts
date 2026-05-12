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

import { WeightUnit } from "../plates";
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

// Build the prescription for a single lift. Squat and the upper-body lift are
// 3×5; Deadlift is 1×5 (it's the lift that gets the most weight added per
// session and is intentionally low-volume in the novice phase).
function liftPrescription(lift: SSLift, weight: number): SSLiftPrescription {
  const setCount = lift === "deadlift" ? 1 : 3;
  const sets: ProgramSet[] = [];
  for (let i = 0; i < setCount; i++) sets.push(workSet(weight, 5));
  return { lift, sets };
}

export function getWorkoutPrescription(
  workout: SSWorkout,
  state: StartingStrengthState,
): SSWorkoutPrescription {
  return WORKOUT_LIFTS[workout].map((lift) => liftPrescription(lift, state.workingWeights[lift]));
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

// Apply the result of a completed workout: lifts that hit their target rep count
// get their working weight bumped by the appropriate increment for next session;
// lifts that missed have their stall counter incremented and (on the FIRST stall
// only) flip incrementAdjusted to true so subsequent sessions use the smaller
// jump. Weight is NOT reset on stall — actual deload handling lives in Wave 1b's
// shared multi-program stall state machine.
export function completeWorkout(
  state: StartingStrengthState,
  result: SSWorkoutResult,
  unit: WeightUnit,
): StartingStrengthState {
  const nextWorkingWeights = { ...state.workingWeights };
  const nextStallCounts = { ...state.stallCounts };
  const nextIncrementAdjusted = { ...state.incrementAdjusted };

  for (const liftResult of result.lifts) {
    const { lift, repsCompleted, targetReps } = liftResult;
    const hit = repsCompleted >= targetReps;
    if (hit) {
      const increment = getProgressionIncrement(lift, state, unit);
      nextWorkingWeights[lift] = state.workingWeights[lift] + increment;
    } else {
      const priorStalls = state.stallCounts[lift];
      nextStallCounts[lift] = priorStalls + 1;
      // Rippetoe canonical "first stall drops the jump" mechanic — only flip on
      // the 0→1 transition. Subsequent stalls keep the flag true.
      if (priorStalls === 0) nextIncrementAdjusted[lift] = true;
    }
  }

  return {
    lastWorkout: result.workout,
    workingWeights: nextWorkingWeights,
    stallCounts: nextStallCounts,
    incrementAdjusted: nextIncrementAdjusted,
    sessionCount: state.sessionCount + 1,
  };
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
  };
}
