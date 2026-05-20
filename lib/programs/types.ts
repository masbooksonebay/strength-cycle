// Program registry shared types.
// Each supported program (5/3/1, Texas Method, future Starting Strength etc.)
// owns its own state slice under AppData.programs[id] and contributes
// metadata + a small set of pure helpers via this interface.

export type ProgramId = "wendler531" | "texasMethod" | "startingStrength";

export interface ProgramMetadata {
  id: ProgramId;
  displayName: string;
  shortDescription: string;
  longDescription: string;
  methodology: string;
  cycleStructure: "four-week" | "weekly" | "per-session";
  primaryMetricLabel: string;
  primaryMetricAbbreviation: string;
  // Route slug under app/onboarding/ for the program's seed-input screen.
  // Used by both the first-launch onboarding flow and the in-app program
  // switcher when activating a program for the first time.
  setupRoute: string;
}

export interface ProgramSet {
  percentage: number;
  reps: number | string;
  isWarmup: boolean;
  isAmrap: boolean;
  weight?: number;
}

export interface Wendler531State {
  currentCycle: number;
}

// TM lift identity used by the Wave 2 stall state machine. Matches the SS
// `SSLift` shape so a future cross-program stall machinery has one vocabulary;
// the canonical TM lift NAMES (with spaces, e.g., "Bench Press") are still
// the source for stallCount/intensityWeights record keys.
export type TMStallLiftKey = "squat" | "press" | "bench" | "deadlift";

// Persistent stall record set by detectStallOnWorkoutComplete and cleared by
// resolveStallChoice. Replaces the ephemeral `Alert.alert` trigger that 1.0.3
// fired inline from TexasMethodWorkoutScreen; the user-facing UI remains the
// same three-button prompt in Wave 2 (Wave 3 will derive a modal from this).
export interface TMPendingStallResolution {
  lift: TMStallLiftKey;
  triggeredOn: string; // ISO timestamp at detection
  currentWeight: number; // Intensity-Day weight that stalled
  amrapReps: number; // reps the user actually hit on the PR set
}

export interface TexasMethodState {
  weekIndex: number;
  // Intensity Day PR-attempt targets per lift. Diverges from oneRepMax-derived
  // 5RM as the user successfully PRs week over week. Reads fall back to the
  // derived 5RM when an entry is absent (fresh seed or new lift).
  intensityWeights: Record<string, number>;
  stallCount: Record<string, number>;
  // Legacy 1.0.3 ephemeral-stall mirror. Preserved so any consumer reading the
  // old field continues to see the same shape; detectStallOnWorkoutComplete /
  // resolveStallChoice keep this synced with pendingStallResolution until
  // Wave 3 drops the legacy field entirely.
  pendingStallChoice: { lift: string; weight: number } | null;
  // 1.0.4 Wave 2 — persisted source-of-truth for an unresolved stall. Wave 3
  // will derive the resolution-prompt UI from this field instead of firing an
  // ephemeral Alert.alert. Null when no stall is pending.
  pendingStallResolution: TMPendingStallResolution | null;
  powerCleanEnabled: boolean;
  bodyweight: number;
}

// Per-lift counter object used for several SS fields below. Defined once so the
// SS state shape stays compact when Wave 2 added three new such fields.
export interface SSPerLiftNumber {
  squat: number;
  press: number;
  bench: number;
  deadlift: number;
}

export interface SSPerLiftBool {
  squat: boolean;
  press: boolean;
  bench: boolean;
  deadlift: boolean;
}

// Starting Strength — Rippetoe novice linear progression. State is per-lift and
// history-driven (no week index): the only "where am I" signal is `lastWorkout`,
// which determines whether the next session is A or B.
//
// Wave 2 adds the full multi-program stall state machine: three-strikes deload,
// rep-scheme drops (5x5 → 5x3 → 5x1), and a `graduationSuggested` flag the
// Wave 3 UI reads to surface the Graduate-to-Texas-Method modal.
export interface StartingStrengthState {
  // Last workout completed; null on first session before any workout.
  lastWorkout: "A" | "B" | null;
  // Current working weights per lift (in user's configured unit).
  workingWeights: SSPerLiftNumber;
  // Per-lift total stall counter (history; Wave 1 mechanic — preserved).
  stallCounts: SSPerLiftNumber;
  // Per-lift flag — true after first stall, switching to the smaller "post-stall"
  // increment for subsequent sessions (Rippetoe canonical: first stall drops the jump).
  incrementAdjusted: SSPerLiftBool;
  // Total sessions completed under SS — drives Deadlift's early-phase taper
  // (first 6 sessions get +15 lb / +7.5 kg, then drops to +10 / +5 even with no stall).
  sessionCount: number;

  // Wave 2 — per-lift consecutive stall counter. Resets to 0 on a successful
  // session at that lift's target reps. The 3 → trigger threshold is the
  // canonical Rippetoe "three strikes" deload rule.
  consecutiveStalls: SSPerLiftNumber;
  // Wave 2 — per-lift rep-scheme stage. 0 = 5x5 (canonical "5x5"), 1 = 5x3,
  // 2 = 5x1. Independent per lift; advances on the second three-strike cycle
  // at a given stage. The "5" in 5x3 / 5x1 is historical Rippetoe lineage —
  // the actual sets prescribed are 3 sets of N reps for Squat/Press/Bench
  // (1 set for Deadlift).
  repSchemeStage: SSPerLiftNumber;
  // Wave 2 — has a deload already occurred at the lift's current rep-scheme
  // stage? On the first three-strike cycle at a stage we deload (10% off,
  // round to nearest 5 lb / 2.5 kg); on the second we drop rep-scheme. Resets
  // to false when the stage advances (fresh stage gets its own deload chance).
  // At stage 2 (5x1) this flag is also set when the graduate trigger fires, so
  // the "5x1 stall cluster on a second lift" cross-state check can read it.
  deloadedAtCurrentStage: SSPerLiftBool;
  // Wave 2 — set true when (a) three consecutive stalls hit at repSchemeStage 2
  // on any single lift, or (b) a 5x1 stall cluster has been recorded on at
  // least two distinct lifts. Wave 3 reads this flag to render the
  // Graduate-to-Texas-Method modal; dismissGraduationPrompt clears it.
  graduationSuggested: boolean;
}

export interface ProgramsState {
  wendler531: Wendler531State;
  texasMethod: TexasMethodState;
  startingStrength: StartingStrengthState;
}

export const DEFAULT_WENDLER531_STATE: Wendler531State = {
  currentCycle: 1,
};

export const DEFAULT_TEXAS_METHOD_STATE: TexasMethodState = {
  weekIndex: 1,
  intensityWeights: {},
  stallCount: {},
  pendingStallChoice: null,
  pendingStallResolution: null,
  powerCleanEnabled: false,
  bodyweight: 0,
};

// Empty-bar starting weights are the same as the user's bar weight; we default
// to 45 lb (Olympic bar) here, and the SS setup screen overwrites these with the
// user's entered starting weights when they activate the program. Existing 1.0.3
// users who never select SS see this default state but never read from it.
export const DEFAULT_STARTING_STRENGTH_STATE: StartingStrengthState = {
  lastWorkout: null,
  workingWeights: { squat: 45, press: 45, bench: 45, deadlift: 45 },
  stallCounts: { squat: 0, press: 0, bench: 0, deadlift: 0 },
  incrementAdjusted: { squat: false, press: false, bench: false, deadlift: false },
  sessionCount: 0,
  consecutiveStalls: { squat: 0, press: 0, bench: 0, deadlift: 0 },
  repSchemeStage: { squat: 0, press: 0, bench: 0, deadlift: 0 },
  deloadedAtCurrentStage: { squat: false, press: false, bench: false, deadlift: false },
  graduationSuggested: false,
};

export const DEFAULT_PROGRAMS_STATE: ProgramsState = {
  wendler531: DEFAULT_WENDLER531_STATE,
  texasMethod: DEFAULT_TEXAS_METHOD_STATE,
  startingStrength: DEFAULT_STARTING_STRENGTH_STATE,
};
