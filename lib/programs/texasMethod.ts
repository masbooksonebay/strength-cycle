// Texas Method — classic Practical Programming variant (Rippetoe / Pendlay).
// Volume / Recovery / Intensity weekly cycle. Bench and Overhead Press
// alternate week-by-week as the main upper-body lift.

import { roundToPrecision, RoundingMode, WeightUnit } from "../plates";
import { ProgramMetadata, ProgramSet, TexasMethodState } from "./types";

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

// Apply progression after a successful Intensity Day.
// - On a successful squat PR (≥5 reps): squat 5RM goes up by `defaultProgressionIncrement`
// - On a successful main-upper-body PR (≥5 reps): that lift's 5RM goes up by `defaultProgressionIncrement`.
//   Off-week upper body (the secondary) waits until next Intensity Day.
// - Deadlift advances every week regardless (it's logged on Volume Day).
//
// Returns the next week's TexasMethodState. The caller increments `weekIndex` separately.
export function applyIntensityDayProgression(args: {
  state: TexasMethodState;
  lift: TmLift;
  reps: number;
  units: WeightUnit;
}): { state: TexasMethodState; stalled: boolean } {
  const { state, lift, reps, units } = args;
  const increment = defaultProgressionIncrement(lift, units);
  const stalled = reps < 5;

  if (stalled) {
    const nextStallCount = { ...state.stallCount, [lift]: (state.stallCount[lift] ?? 0) + 1 };
    return {
      state: {
        ...state,
        stallCount: nextStallCount,
        pendingStallChoice: { lift, weight: state.intensityWeights[lift] ?? state.fiveRMs[lift] ?? 0 },
      },
      stalled: true,
    };
  }

  const currentIntensity = state.intensityWeights[lift] ?? state.fiveRMs[lift] ?? 0;
  const nextIntensity = currentIntensity + increment;
  return {
    state: {
      ...state,
      fiveRMs: { ...state.fiveRMs, [lift]: nextIntensity },
      intensityWeights: { ...state.intensityWeights, [lift]: nextIntensity },
      stallCount: { ...state.stallCount, [lift]: 0 },
      pendingStallChoice: null,
    },
    stalled: false,
  };
}

// Stall response options the user picks from the alert prompt.
//   "repeat"  → next week prescribes the same intensity weight; user re-attempts.
//   "cut10"   → next week's Volume Day is reduced by 10% (intensity stays same).
//   "deload"  → next week starts at 85% of the stalled intensity weight, then progresses.
export type StallResponse = "repeat" | "cut10" | "deload";

export function applyStallResponse(args: {
  state: TexasMethodState;
  lift: TmLift;
  response: StallResponse;
  precision: number;
  rounding: RoundingMode;
}): TexasMethodState {
  const { state, lift, response, precision, rounding } = args;
  const stalledWeight = state.intensityWeights[lift] ?? state.fiveRMs[lift] ?? 0;

  if (response === "repeat") {
    return { ...state, pendingStallChoice: null };
  }
  if (response === "cut10") {
    return { ...state, pendingStallChoice: null };
  }
  // deload: 85% of stalled intensity, will progress back up over 2-3 weeks.
  const deloadWeight = roundToPrecision(stalledWeight * 0.85, precision, rounding);
  return {
    ...state,
    fiveRMs: { ...state.fiveRMs, [lift]: deloadWeight },
    intensityWeights: { ...state.intensityWeights, [lift]: deloadWeight },
    pendingStallChoice: null,
  };
}

// Volume Day cut multiplier when stall response was "cut10".
export const VOLUME_CUT_MULTIPLIER = 0.9;

// Seed initial Texas Method state from onboarding inputs. Accepts either a 5RM
// directly or a 1RM (in which case 5RM is estimated via reverse Epley at 0.85).
//
// `liftMaxes` keys are lift names ("Squat", "Bench Press", "Deadlift",
// "Overhead Press"). Each entry is { value, kind } where kind tells us whether
// the value is a true 5RM the user knows or a 1RM we should derive from.
export interface OnboardingMaxInput {
  value: number;
  kind: "fiveRM" | "oneRM";
}

export function seedTexasMethodState(args: {
  liftMaxes: Record<string, OnboardingMaxInput>;
  powerCleanEnabled?: boolean;
  bodyweight?: number;
}): TexasMethodState {
  const { liftMaxes, powerCleanEnabled = false, bodyweight = 0 } = args;
  const fiveRMs: Record<string, number> = {};
  const intensityWeights: Record<string, number> = {};
  const stallCount: Record<string, number> = {};

  for (const [lift, input] of Object.entries(liftMaxes)) {
    const fiveRM = input.kind === "oneRM" ? fiveRMFromOneRM(input.value) : Math.round(input.value);
    fiveRMs[lift] = fiveRM;
    intensityWeights[lift] = fiveRM;
    stallCount[lift] = 0;
  }

  return {
    weekIndex: 1,
    fiveRMs,
    intensityWeights,
    stallCount,
    pendingStallChoice: null,
    powerCleanEnabled,
    bodyweight,
  };
}

// Advance to the next training week. Bench/OHP swap as the main upper-body
// lift; squat/deadlift/etc. don't change role with weekIndex parity.
export function advanceWeekIndex(state: TexasMethodState): TexasMethodState {
  return { ...state, weekIndex: state.weekIndex + 1 };
}

// Deadlift on Volume Day is supplementary and progresses every week
// regardless of upper-body alternation. Call this after a successful Volume
// Day deadlift (5 reps clean).
export function applyDeadliftVolumeProgression(args: {
  state: TexasMethodState;
  reps: number;
  units: WeightUnit;
}): TexasMethodState {
  const { state, reps, units } = args;
  if (reps < 5) return state;
  const increment = deadliftWeeklyIncrement(units);
  const current = state.fiveRMs.Deadlift ?? 0;
  return {
    ...state,
    fiveRMs: { ...state.fiveRMs, Deadlift: current + increment },
    intensityWeights: { ...state.intensityWeights, Deadlift: current + increment },
  };
}

// Helper for sample-data and tests: produce the day prescription for a given
// lift, day, and current state. Returns an empty array when that lift is not
// trained on that day.
export function getDaySets(args: {
  day: TmDay;
  lift: TmLift;
  state: TexasMethodState;
  precision: number;
  rounding: RoundingMode;
}): ProgramSet[] {
  const { day, lift, state, precision, rounding } = args;
  const fiveRM = state.fiveRMs[lift] ?? 0;

  if (day === "volume") {
    return getVolumeDaySets({ lift, weekIndex: state.weekIndex, fiveRM, precision, rounding });
  }
  if (day === "recovery") {
    const main = mainUpperLiftForWeek(state.weekIndex);
    const mainFiveRM = state.fiveRMs[main] ?? 0;
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
  const intensityWeight = state.intensityWeights[lift] ?? state.fiveRMs[lift] ?? 0;
  return getIntensityDaySets({ lift, weekIndex: state.weekIndex, intensityWeight, precision, rounding });
}
