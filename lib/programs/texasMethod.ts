// Texas Method — classic Practical Programming variant (Rippetoe / Pendlay).
// Volume / Recovery / Intensity weekly cycle. Bench and Overhead Press
// alternate week-by-week as the main upper-body lift.

import { roundToPrecision, RoundingMode, WeightUnit } from "../plates";
import { ProgramMetadata, ProgramSet, TexasMethodState, TMStallLiftKey } from "./types";

export const TEXAS_METHOD_METADATA: ProgramMetadata = {
  id: "texasMethod",
  displayName: "Texas Method",
  shortDescription: "Volume · Recovery · Intensity weekly · 5RM PR attempts",
  longDescription:
    "Volume/Recovery/Intensity weekly structure with 5RM PR attempts. Best for post-novice intermediate lifters.",
  methodology: "Rippetoe / Pendlay — Practical Programming",
  cycleStructure: "weekly",
  primaryMetricLabel: "5 Rep Max",
  primaryMetricAbbreviation: "5RM",
  setupRoute: "texasmethod-setup",
};

export type TmDay = "volume" | "recovery" | "intensity";
export const TM_DAYS: { id: TmDay; label: string; short: string }[] = [
  { id: "volume", label: "Volume Day", short: "Volume" },
  { id: "recovery", label: "Recovery Day", short: "Recovery" },
  { id: "intensity", label: "Intensity Day", short: "Intensity" },
];

export const TM_LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
export type TmLift = (typeof TM_LIFTS)[number];

// Bench is the main upper-body lift on odd-numbered weeks (week 1, 3, 5...).
// Overhead Press is the main upper-body lift on even-numbered weeks.
export function mainUpperLiftForWeek(weekIndex: number): "Bench Press" | "Overhead Press" {
  return weekIndex % 2 === 1 ? "Bench Press" : "Overhead Press";
}

export function secondaryUpperLiftForWeek(weekIndex: number): "Bench Press" | "Overhead Press" {
  return weekIndex % 2 === 1 ? "Overhead Press" : "Bench Press";
}

// Reverse-Epley estimate: 5RM ≈ 1RM × 0.85.
export function fiveRMFromOneRM(oneRM: number): number {
  return Math.round(oneRM * 0.85);
}

// Single source of truth for TM 5RM at render time. lifts[name].oneRepMax
// drives every Volume / Recovery weight; Intensity Day reads intensityWeights
// (which diverges as the user PRs) with this as the fallback. Rounded to the
// user's precision setting so plate calculations land on real plates.
export interface LiftLike {
  name: string;
  oneRepMax: number;
}

export function getCurrentFiveRM(args: {
  lifts: LiftLike[];
  lift: string;
  precision: number;
  rounding: RoundingMode;
}): number {
  const { lifts, lift, precision, rounding } = args;
  const oneRM = lifts.find((l) => l.name === lift)?.oneRepMax ?? 0;
  return roundToPrecision(oneRM * 0.85, precision, rounding);
}

// Volume Day: 5x5 squat at 90% of current 5RM, 5x5 main upper-body at 90% of 5RM,
// 1x5 deadlift at 80% of 5RM (supplementary).
//
// Texas Method normally uses one bar warmup ramp before working sets. We follow
// 5/3/1's existing pattern of computing warmup percentages so the experience is
// consistent and the plate calculator has data to render.
export function getVolumeDaySets(args: {
  lift: TmLift;
  weekIndex: number;
  fiveRM: number;
  precision: number;
  rounding: RoundingMode;
}): ProgramSet[] {
  const { lift, weekIndex, fiveRM, precision, rounding } = args;
  const main = mainUpperLiftForWeek(weekIndex);

  // Deadlift on Volume Day: 1x5 @ 80% of 5RM (supplementary).
  if (lift === "Deadlift") {
    return [
      { percentage: 50, reps: 5, isWarmup: true, isAmrap: false, weight: roundToPrecision(fiveRM * 0.5, precision, rounding) },
      { percentage: 65, reps: 3, isWarmup: true, isAmrap: false, weight: roundToPrecision(fiveRM * 0.65, precision, rounding) },
      { percentage: 80, reps: 5, isWarmup: false, isAmrap: false, weight: roundToPrecision(fiveRM * 0.8, precision, rounding) },
    ];
  }

  // Squat is always 5x5 @ 90% of 5RM.
  // Main upper body for the week is 5x5 @ 90% of 5RM. Off-week upper body has no volume work.
  if (lift === "Squat" || lift === main) {
    const top = roundToPrecision(fiveRM * 0.9, precision, rounding);
    const w1 = roundToPrecision(fiveRM * 0.5, precision, rounding);
    const w2 = roundToPrecision(fiveRM * 0.7, precision, rounding);
    return [
      { percentage: 50, reps: 5, isWarmup: true, isAmrap: false, weight: w1 },
      { percentage: 70, reps: 5, isWarmup: true, isAmrap: false, weight: w2 },
      { percentage: 90, reps: 5, isWarmup: false, isAmrap: false, weight: top },
      { percentage: 90, reps: 5, isWarmup: false, isAmrap: false, weight: top },
      { percentage: 90, reps: 5, isWarmup: false, isAmrap: false, weight: top },
      { percentage: 90, reps: 5, isWarmup: false, isAmrap: false, weight: top },
      { percentage: 90, reps: 5, isWarmup: false, isAmrap: false, weight: top },
    ];
  }

  // Off-week upper body lift gets no Volume Day work.
  return [];
}

// Recovery Day: 2x5 squat @ 80% of Volume Day weight, 3x5 OHP/Press at slightly
// lighter than this week's main, chin-ups 3 sets to AMRAP (bodyweight).
//
// Pendlay's spec: the secondary upper-body lift on Recovery Day is 3x5 at a
// weight slightly lighter than the main lift's working weight. We use 85% of
// the main lift's 5RM (≈ 5% under Volume Day's 90%) as a good default.
export function getRecoveryDaySets(args: {
  lift: TmLift;
  weekIndex: number;
  fiveRM: number;
  volumeDayWeight: number;
  precision: number;
  rounding: RoundingMode;
}): ProgramSet[] {
  const { lift, weekIndex, fiveRM, volumeDayWeight, precision, rounding } = args;
  const secondary = secondaryUpperLiftForWeek(weekIndex);

  if (lift === "Squat") {
    const recoveryWeight = roundToPrecision(volumeDayWeight * 0.8, precision, rounding);
    const warm1 = roundToPrecision(recoveryWeight * 0.55, precision, rounding);
    const warm2 = roundToPrecision(recoveryWeight * 0.8, precision, rounding);
    return [
      { percentage: 44, reps: 5, isWarmup: true, isAmrap: false, weight: warm1 },
      { percentage: 64, reps: 5, isWarmup: true, isAmrap: false, weight: warm2 },
      { percentage: 80, reps: 5, isWarmup: false, isAmrap: false, weight: recoveryWeight },
      { percentage: 80, reps: 5, isWarmup: false, isAmrap: false, weight: recoveryWeight },
    ];
  }

  if (lift === secondary) {
    const work = roundToPrecision(fiveRM * 0.85, precision, rounding);
    const warm1 = roundToPrecision(work * 0.6, precision, rounding);
    const warm2 = roundToPrecision(work * 0.85, precision, rounding);
    return [
      { percentage: 51, reps: 5, isWarmup: true, isAmrap: false, weight: warm1 },
      { percentage: 72, reps: 5, isWarmup: true, isAmrap: false, weight: warm2 },
      { percentage: 85, reps: 5, isWarmup: false, isAmrap: false, weight: work },
      { percentage: 85, reps: 5, isWarmup: false, isAmrap: false, weight: work },
      { percentage: 85, reps: 5, isWarmup: false, isAmrap: false, weight: work },
    ];
  }

  // Deadlift / off-week upper-body have no Recovery Day work.
  // (Chin-ups are accessory; not represented in the main set list.)
  return [];
}

// Intensity Day: 1x5 squat (PR attempt), 1x5 main upper-body (PR attempt),
// 5x3 power clean at ~70% 1RM-clean (supplementary, optional).
//
// The PR attempt set is treated as AMRAP-style (5+) — if the user grinds out
// more than 5 reps, the e1RM benefit is recorded.
export function getIntensityDaySets(args: {
  lift: TmLift;
  weekIndex: number;
  intensityWeight: number;
  precision: number;
  rounding: RoundingMode;
}): ProgramSet[] {
  const { lift, weekIndex, intensityWeight, precision, rounding } = args;
  const main = mainUpperLiftForWeek(weekIndex);

  // Deadlift is not on Intensity Day in the classic Practical Programming variant.
  if (lift === "Deadlift") return [];

  if (lift === "Squat" || lift === main) {
    const work = intensityWeight;
    const warm1 = roundToPrecision(work * 0.5, precision, rounding);
    const warm2 = roundToPrecision(work * 0.7, precision, rounding);
    const warm3 = roundToPrecision(work * 0.85, precision, rounding);
    return [
      { percentage: 50, reps: 5, isWarmup: true, isAmrap: false, weight: warm1 },
      { percentage: 70, reps: 3, isWarmup: true, isAmrap: false, weight: warm2 },
      { percentage: 85, reps: 2, isWarmup: true, isAmrap: false, weight: warm3 },
      { percentage: 100, reps: "5+", isWarmup: false, isAmrap: true, weight: work },
    ];
  }

  return [];
}

// Default progression on a successful Intensity Day (≥5 clean reps on the PR set).
export function defaultProgressionIncrement(lift: string, units: WeightUnit): number {
  if (units === "lb") {
    return 5;
  }
  return 2.5;
}

// On Volume Day deadlift (1x5 supplementary), deadlift 5RM advances every week
// independent of the bench/press alternation.
export function deadliftWeeklyIncrement(units: WeightUnit): number {
  return units === "lb" ? 5 : 2.5;
}

// Calculate e1RM for a Texas Method PR top set. We use the same Epley formula
// as 5/3/1's existing chart for consistency.
export function calcE1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ─── Wave 2: TM stall state machine ──────────────────────────────────────────
//
// 1.0.3 fired the stall prompt as an ephemeral Alert.alert from
// TexasMethodWorkoutScreen the moment AMRAP reps < 5 were saved; the legacy
// `pendingStallChoice` field existed but was never actually written by the
// live screen flow (only by applyIntensityDayProgression's stall branch,
// which the screen bypassed). 1.0.4 Wave 2 introduces:
//
//   - pendingStallResolution (richer payload: triggeredOn + amrapReps)
//     as the persisted source-of-truth, written by detectStallOnWorkoutComplete.
//   - resolveStallChoice, the single resolution funnel — clears the persistent
//     fields, bumps stallCount for tracking, and applies the user's choice.
//
// The legacy pendingStallChoice field is kept mirrored on both writes so any
// outside consumer reading the old shape sees the same trigger.
//
// User-facing UI in Wave 2 is unchanged (same Alert.alert with same 3 buttons).
// Wave 3 will derive a modal from pendingStallResolution so that killing the
// app mid-stall no longer loses the prompt.

// Bidirectional mapping between TM canonical lift names ("Bench Press") and
// the lowercase stall-machine keys ("bench") used by pendingStallResolution.
const TM_LIFT_NAME_TO_KEY: Record<TmLift, TMStallLiftKey> = {
  Squat: "squat",
  "Bench Press": "bench",
  Deadlift: "deadlift",
  "Overhead Press": "press",
};

const TM_LIFT_KEY_TO_NAME: Record<TMStallLiftKey, TmLift> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Overhead Press",
};

// Write the persistent stall record. The legacy pendingStallChoice is mirrored
// so any caller still reading the old shape sees the same trigger.
export function detectStallOnWorkoutComplete(args: {
  state: TexasMethodState;
  lift: TmLift;
  currentWeight: number;
  amrapReps: number;
  triggeredOn?: string; // ISO timestamp; defaults to now
}): TexasMethodState {
  const { state, lift, currentWeight, amrapReps } = args;
  const triggeredOn = args.triggeredOn ?? new Date().toISOString();
  return {
    ...state,
    pendingStallResolution: {
      lift: TM_LIFT_NAME_TO_KEY[lift],
      triggeredOn,
      currentWeight,
      amrapReps,
    },
    pendingStallChoice: { lift, weight: currentWeight }, // legacy mirror
  };
}

// New choice vocabulary for Wave 2. The legacy "cut10" is renamed "cutVolume"
// to match the user-facing label; the legacy 'repeat'/'deload' names carry over.
export type TMStallChoice = "repeat" | "cutVolume" | "deload";

// Resolve a pending stall. Reads currentWeight from state.pendingStallResolution
// (set by detectStallOnWorkoutComplete) so callers do not need to re-derive it.
// On every resolution path, stallCount[lift] is incremented for history.
// No-op if no resolution is pending.
//
// Behavior per choice (preserves 1.0.3 simple-alert semantics exactly):
//   - repeat:     clears the pending record; user re-attempts at the same weight.
//   - cutVolume:  clears the pending record. NOTE: 1.0.3 shipped the button but
//                 the code path was a no-op — the Volume Day reduction was
//                 never wired up. Wave 2 preserves that behavior; Wave 3 may
//                 give the button real meaning by reducing Volume Day weight.
//   - deload:     intensityWeights[lift] = currentWeight × 0.85, then clears.
export function resolveStallChoice(args: {
  state: TexasMethodState;
  choice: TMStallChoice;
  precision: number;
  rounding: RoundingMode;
}): TexasMethodState {
  const { state, choice, precision, rounding } = args;
  const pending = state.pendingStallResolution;
  if (!pending) return state; // nothing to resolve

  const liftName = TM_LIFT_KEY_TO_NAME[pending.lift];
  const bumpedStallCount = {
    ...state.stallCount,
    [liftName]: (state.stallCount[liftName] ?? 0) + 1,
  };

  // Clear both the new and legacy pending fields together.
  const cleared = {
    ...state,
    stallCount: bumpedStallCount,
    pendingStallResolution: null,
    pendingStallChoice: null,
  };

  if (choice === "repeat") return cleared;
  if (choice === "cutVolume") return cleared; // 1.0.3-preserved no-op

  // deload: 85% of the stalled intensity weight; will progress back up week-over-week.
  const deloadWeight = roundToPrecision(pending.currentWeight * 0.85, precision, rounding);
  return {
    ...cleared,
    intensityWeights: { ...cleared.intensityWeights, [liftName]: deloadWeight },
  };
}

// Apply progression after an Intensity Day workout. Consolidated in Wave 2 so
// the stall branch routes through detectStallOnWorkoutComplete (persists the
// pendingStallResolution) instead of writing the legacy field directly.
// - On a successful squat PR (≥5 reps): squat 5RM goes up by `defaultProgressionIncrement`
// - On a successful main-upper-body PR (≥5 reps): that lift's 5RM goes up by `defaultProgressionIncrement`.
//   Off-week upper body (the secondary) waits until next Intensity Day.
// - Deadlift advances every week regardless (it's logged on Volume Day).
//
// Returns the next week's TexasMethodState plus a `stalled` flag the caller
// uses to decide whether to surface the resolution prompt. The caller still
// increments `weekIndex` separately.
export function applyIntensityDayProgression(args: {
  state: TexasMethodState;
  lift: TmLift;
  reps: number;
  units: WeightUnit;
  // Caller supplies the current intensity baseline (intensityWeights[lift]
  // with derived-5RM fallback) so progression is computed from a known floor.
  currentIntensity: number;
}): { state: TexasMethodState; stalled: boolean } {
  const { state, lift, reps, units, currentIntensity } = args;
  const increment = defaultProgressionIncrement(lift, units);
  const stalled = reps < 5;

  if (stalled) {
    return {
      state: detectStallOnWorkoutComplete({
        state,
        lift,
        currentWeight: currentIntensity,
        amrapReps: reps,
      }),
      stalled: true,
    };
  }

  const nextIntensity = currentIntensity + increment;
  return {
    state: {
      ...state,
      intensityWeights: { ...state.intensityWeights, [lift]: nextIntensity },
      stallCount: { ...state.stallCount, [lift]: 0 },
      pendingStallChoice: null,
      pendingStallResolution: null,
    },
    stalled: false,
  };
}

// Seed initial Texas Method state. Reads each TM lift's oneRepMax from the
// canonical lifts array and seeds intensityWeights to the derived 5RM so the
// first Intensity Day has a starting target. After that, intensityWeights
// progresses on its own via applyIntensityDayProgression.
export function seedTexasMethodState(args: {
  lifts: LiftLike[];
  precision: number;
  rounding: RoundingMode;
  powerCleanEnabled?: boolean;
  bodyweight?: number;
}): TexasMethodState {
  const { lifts, precision, rounding, powerCleanEnabled = false, bodyweight = 0 } = args;
  const intensityWeights: Record<string, number> = {};
  const stallCount: Record<string, number> = {};

  for (const liftName of TM_LIFTS) {
    const fiveRM = getCurrentFiveRM({ lifts, lift: liftName, precision, rounding });
    if (fiveRM > 0) intensityWeights[liftName] = fiveRM;
    stallCount[liftName] = 0;
  }

  return {
    weekIndex: 1,
    intensityWeights,
    stallCount,
    pendingStallChoice: null,
    pendingStallResolution: null,
    powerCleanEnabled,
    bodyweight,
    // Caller (TM setup screen) overrides to true on Get Started; a fresh
    // seed without explicit user confirmation reads as not-yet-set-up.
    setupComplete: false,
  };
}

// Advance to the next training week. Bench/OHP swap as the main upper-body
// lift; squat/deadlift/etc. don't change role with weekIndex parity.
export function advanceWeekIndex(state: TexasMethodState): TexasMethodState {
  return { ...state, weekIndex: state.weekIndex + 1 };
}

// Helper for sample-data and tests: produce the day prescription for a given
// lift, day, and current state. Returns an empty array when that lift is not
// trained on that day.
export function getDaySets(args: {
  day: TmDay;
  lift: TmLift;
  state: TexasMethodState;
  // lifts is the canonical 1RM source — Volume / Recovery weights derive from
  // it via getCurrentFiveRM. Settings 1RM edits propagate here automatically.
  lifts: LiftLike[];
  precision: number;
  rounding: RoundingMode;
}): ProgramSet[] {
  const { day, lift, state, lifts, precision, rounding } = args;
  const fiveRM = getCurrentFiveRM({ lifts, lift, precision, rounding });

  if (day === "volume") {
    return getVolumeDaySets({ lift, weekIndex: state.weekIndex, fiveRM, precision, rounding });
  }
  if (day === "recovery") {
    const main = mainUpperLiftForWeek(state.weekIndex);
    const mainFiveRM = getCurrentFiveRM({ lifts, lift: main, precision, rounding });
    const volumeDayWeight = roundToPrecision(mainFiveRM * 0.9, precision, rounding);
    return getRecoveryDaySets({
      lift,
      weekIndex: state.weekIndex,
      fiveRM,
      volumeDayWeight,
      precision,
      rounding,
    });
  }
  // intensity
  const intensityWeight = state.intensityWeights[lift] ?? fiveRM;
  return getIntensityDaySets({ lift, weekIndex: state.weekIndex, intensityWeight, precision, rounding });
}
