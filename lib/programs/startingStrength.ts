// Starting Strength — Mark Rippetoe's novice linear progression.
//
// CANONICAL IMPLEMENTATION (1.0.4 SS rebuild). This replaces the pre-rebuild
// Wave 1a/2 data layer, which was a Stronglifts-influenced hybrid: it added
// 5x5 → 5x3 → 5x1 rep-scheme drops, a three-consecutive-stall deload rule, and
// in-app "graduation" logic — none of which are Rippetoe's published method.
//
// The canonical model implemented here, per Starting Strength: Basic Barbell
// Training (3rd ed.) and startingstrength.com:
//
//   Three phases:
//     Phase 1 — Ramp-up (~3 weeks): A = Squat/Press/Deadlift,
//               B = Squat/Bench/Deadlift. Auto-advances after 9 sessions.
//     Phase 2 — Main Phase: Workout B's deadlift slot becomes the pull variant
//               (Bent-Over Row by default, or Power Clean if the user opts in).
//     Phase 3 — Advanced Novice (user-opted, not automatic): Workout B swaps in
//               Chin-ups; Workout A alternates its third lift between the
//               deadlift and the pull variant.
//
//   Progression: every barbell lift adds a fixed per-session increment. After a
//   lift's first deload it switches to a reduced (microloading) increment.
//
//   Stall protocol: 2 consecutive failed sessions on a lift → a 10% deload on
//   that lift only, then microloading. No rep-scheme drops. Persistent failure
//   to progress is resolved by the user manually switching to Texas Method or
//   5/3/1 from onboarding — there is no in-app graduation logic.
//
//   Schedule: 3 non-consecutive days/week, A/B alternation.
//
// All exported functions are pure (no side effects, no I/O). Weight math takes
// the user's unit as an explicit argument.

import { WeightUnit, roundToPrecision } from "../plates";
import { ProgramMetadata, SSLiftKey, SSPullVariant, StartingStrengthState } from "./types";

// Re-export the SS state types + default (defined in ./types alongside the
// other program state shapes) so consumers can import the full SS surface from
// this module.
export type { SSLiftKey, SSPullVariant, StartingStrengthState } from "./types";
export { DEFAULT_STARTING_STRENGTH_STATE } from "./types";

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

// Workout identity. Sessions strictly alternate A/B/A/B…, starting at A.
export type SSWorkout = "A" | "B";

// Canonical display labels. Aligned with the lift names used elsewhere in the
// app (5/3/1, TM use "Bench Press" / "Overhead Press") so cross-program history
// lookups by name keep working. Always use these for display — never raw keys.
export const SS_LIFT_DISPLAY_NAME: Record<SSLiftKey, string> = {
  squat: "Squat",
  press: "Overhead Press",
  bench: "Bench Press",
  deadlift: "Deadlift",
  row: "Bent-Over Row",
  powerClean: "Power Clean",
  chinUp: "Chin-Up",
};

// Short labels for the three published phases.
export const SS_PHASE_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: "Ramp-up",
  2: "Main Phase",
  3: "Advanced Novice",
};

// One lift's work-set prescription for the current session. SS is not a
// percentage-of-1RM program — every work set is the same absolute `weight`.
export interface SSPrescription {
  lift: SSLiftKey;
  sets: number;
  reps: number; // target reps per work set; 0 for AMRAP lifts (chin-ups)
  isAmrap: boolean; // true for chin-ups — every set taken to failure
  weight: number; // working weight in the user's unit; 0 for chin-ups (bodyweight)
}

// ── Constants ──────────────────────────────────────────────────────────────

// Per-session linear-progression increment. Every barbell lift uses the same
// jump; a lift switches from `full` to `reduced` once its microloading flag is
// set (after its first deload).
const SS_INCREMENT: Record<"full" | "reduced", Record<WeightUnit, number>> = {
  full: { lb: 5, kg: 2.5 },
  reduced: { lb: 2.5, kg: 1.25 },
};

// Deload: 10% off the lift's working weight, rounded to a plate-friendly step
// (coarser than the user's precision setting so the deload lands cleanly).
const SS_DELOAD_MULTIPLIER = 0.9;
const SS_DELOAD_ROUNDING: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };

// Phase 1 (Ramp-up) auto-advances to Phase 2 after this many completed sessions
// (3 weeks at 3 sessions/week).
const PHASE_1_SESSION_TARGET = 9;

// Consecutive failed sessions on one lift that trigger a deload on that lift.
const FAILURE_DELOAD_THRESHOLD = 2;

// Work-set scheme per lift. Warm-up sets are intentionally NOT modelled in the
// data layer — the workout screen derives them (Stage 3 scope).
const SS_SET_SCHEME: Record<SSLiftKey, { sets: number; reps: number; isAmrap: boolean }> = {
  squat: { sets: 3, reps: 5, isAmrap: false },
  press: { sets: 3, reps: 5, isAmrap: false },
  bench: { sets: 3, reps: 5, isAmrap: false },
  deadlift: { sets: 1, reps: 5, isAmrap: false },
  row: { sets: 3, reps: 5, isAmrap: false },
  powerClean: { sets: 5, reps: 3, isAmrap: false },
  chinUp: { sets: 3, reps: 0, isAmrap: true },
};

// ── Internal helpers ───────────────────────────────────────────────────────

// Next workout letter. Sessions strictly alternate; the first session (no
// lastWorkout) is A.
function nextWorkoutLetter(state: StartingStrengthState): SSWorkout {
  return state.lastWorkout === "A" ? "B" : "A";
}

// The SSLiftKey the pull-variant preference selects.
function pullVariantKey(variant: SSPullVariant): SSLiftKey {
  return variant === "power_clean" ? "powerClean" : "row";
}

// ── Workout composition ────────────────────────────────────────────────────

// Lifts prescribed for the next workout, in order. Driven by currentPhase,
// lastWorkout (A/B alternation) and pullVariantPreference.
export function getCurrentWorkoutLifts(state: StartingStrengthState): SSLiftKey[] {
  const workout = nextWorkoutLetter(state);
  const pull = pullVariantKey(state.pullVariantPreference);

  if (state.currentPhase === 1) {
    return workout === "A"
      ? ["squat", "press", "deadlift"]
      : ["squat", "bench", "deadlift"];
  }

  if (state.currentPhase === 2) {
    // Workout B's deadlift slot becomes the pull variant.
    return workout === "A"
      ? ["squat", "press", "deadlift"]
      : ["squat", "bench", pull];
  }

  // Phase 3 (Advanced Novice). Workout B swaps the third movement for chin-ups.
  // Workout A alternates its third movement session-to-session between the
  // deadlift and the pull variant. The state shape carries no dedicated tracker
  // for that sub-alternation, so it is derived from sessionCount parity: with
  // strict A/B alternation from session 0 = A, A sessions land on even
  // sessionCount values, so the upcoming A's index is sessionCount / 2 —
  // even index → deadlift, odd index → pull variant.
  if (workout === "B") return ["squat", "bench", "chinUp"];
  const aSessionIndex = Math.floor(state.sessionCount / 2);
  const thirdLift: SSLiftKey = aSessionIndex % 2 === 0 ? "deadlift" : pull;
  return ["squat", "press", thirdLift];
}

// Work-set prescription for a single lift in the current state.
export function getWorkoutPrescription(
  state: StartingStrengthState,
  lift: SSLiftKey,
): SSPrescription {
  const scheme = SS_SET_SCHEME[lift];
  return {
    lift,
    sets: scheme.sets,
    reps: scheme.reps,
    isAmrap: scheme.isAmrap,
    weight: state.workingWeights[lift],
  };
}

// ── Progression ────────────────────────────────────────────────────────────

// Per-session weight increment for a lift, in the user's unit. Lifts switch to
// the reduced (microloading) increment after their first deload. Chin-ups
// progress by reps, not load, so their increment is 0.
export function getProgressionIncrement(
  state: StartingStrengthState,
  lift: SSLiftKey,
  unit: WeightUnit,
): number {
  if (lift === "chinUp") return 0;
  const tier = state.microloadingActive[lift] ? "reduced" : "full";
  return SS_INCREMENT[tier][unit];
}

// Apply a 10% deload to one lift: drop the working weight (rounded to a
// plate-friendly step), record the deload, activate microloading, and clear the
// lift's consecutive-failure counter. Chin-ups carry no load — a no-op for them.
export function applyDeload(
  state: StartingStrengthState,
  lift: SSLiftKey,
  unit: WeightUnit,
): StartingStrengthState {
  if (lift === "chinUp") return state;
  const deloaded = roundToPrecision(
    state.workingWeights[lift] * SS_DELOAD_MULTIPLIER,
    SS_DELOAD_ROUNDING[unit],
  );
  return {
    ...state,
    workingWeights: { ...state.workingWeights, [lift]: deloaded },
    deloadHistory: { ...state.deloadHistory, [lift]: state.deloadHistory[lift] + 1 },
    microloadingActive: { ...state.microloadingActive, [lift]: true },
    consecutiveFailures: { ...state.consecutiveFailures, [lift]: 0 },
  };
}

// Register the outcome of a single lift in the current session (per-lift
// tap-to-complete logging). On success: clear the failure counter and add the
// per-session increment. On failure: bump the consecutive-failure counter — and
// once it reaches the threshold (2), automatically apply the 10% deload (which
// also resets the counter and activates microloading). Chin-ups are rep-based:
// registering a chin-up outcome only clears its counter, never changes weight.
export function registerSetResult(
  state: StartingStrengthState,
  lift: SSLiftKey,
  didCompleteAllReps: boolean,
  unit: WeightUnit,
): StartingStrengthState {
  if (lift === "chinUp") {
    return {
      ...state,
      consecutiveFailures: { ...state.consecutiveFailures, chinUp: 0 },
    };
  }

  if (didCompleteAllReps) {
    const increment = getProgressionIncrement(state, lift, unit);
    return {
      ...state,
      consecutiveFailures: { ...state.consecutiveFailures, [lift]: 0 },
      workingWeights: {
        ...state.workingWeights,
        [lift]: state.workingWeights[lift] + increment,
      },
    };
  }

  const failures = state.consecutiveFailures[lift] + 1;
  const afterFailure: StartingStrengthState = {
    ...state,
    consecutiveFailures: { ...state.consecutiveFailures, [lift]: failures },
  };
  if (failures >= FAILURE_DELOAD_THRESHOLD) {
    return applyDeload(afterFailure, lift, unit);
  }
  return afterFailure;
}

// ── Phase / session lifecycle ──────────────────────────────────────────────

// Whether the automatic Phase 1 → 2 transition should fire. Only this
// transition is automatic — Phase 2 → 3 is a manual, user-opted toggle.
export function shouldAdvancePhase(state: StartingStrengthState): boolean {
  return state.currentPhase === 1 && state.phaseSessionCount >= PHASE_1_SESSION_TARGET;
}

// Finalize a workout. Rotates the A/B schedule and advances the lifetime
// session count; only a fully completed session counts toward the Phase 1 → 2
// ramp-up trigger (an abandoned session still rotates the schedule). Fires the
// Phase 1 → 2 transition when the ramp-up target is reached.
export function completeWorkout(
  state: StartingStrengthState,
  didCompleteAllLifts: boolean,
): StartingStrengthState {
  const justCompleted = nextWorkoutLetter(state);
  const advanced: StartingStrengthState = {
    ...state,
    lastWorkout: justCompleted,
    sessionCount: state.sessionCount + 1,
    phaseSessionCount: didCompleteAllLifts
      ? state.phaseSessionCount + 1
      : state.phaseSessionCount,
  };

  if (shouldAdvancePhase(advanced)) {
    return { ...advanced, currentPhase: 2, phaseSessionCount: 0 };
  }
  return advanced;
}

// Set the Workout B pull-variant preference (Bent-Over Row or Power Clean).
export function togglePullVariant(
  state: StartingStrengthState,
  variant: SSPullVariant,
): StartingStrengthState {
  return { ...state, pullVariantPreference: variant };
}
