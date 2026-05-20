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

// Starting Strength — Rippetoe novice linear progression (canonical, 1.0.4 SS
// rebuild). Replaces the pre-rebuild Wave 1a/2 shape, which layered Stronglifts
// mechanics (5x5 → 5x3 → 5x1 rep-scheme drops, a three-consecutive-stall deload
// rule, in-app "graduation") onto SS. The canonical model: three published
// phases, per-lift linear progression with a two-consecutive-failure → 10%
// deload rule, and a user-selectable Workout B pull movement. Advancing past
// novice LP is a manual switch to Texas Method or 5/3/1 — no in-app graduation.
export type SSLiftKey =
  | "squat"
  | "press"
  | "bench"
  | "deadlift"
  | "row"
  | "powerClean"
  | "chinUp";

// Workout B's third movement: Bent-Over Row (default) or Power Clean. Stored as
// its own preference string — distinct from the `row` / `powerClean` SSLiftKey
// values it selects between — so the Settings toggle has a stable vocabulary.
export type SSPullVariant = "row" | "power_clean";

export interface StartingStrengthState {
  // Published Rippetoe phase: 1 = Ramp-up, 2 = Main Phase, 3 = Advanced Novice.
  currentPhase: 1 | 2 | 3;
  // Sessions completed within the current phase. Drives the automatic
  // Phase 1 → 2 transition (fires at 9 completed sessions, ~3 weeks).
  phaseSessionCount: number;
  // Workout B pull-movement preference. Defaults to "row"; user toggles in Settings.
  pullVariantPreference: SSPullVariant;
  // Current working weight per lift, in the user's configured unit.
  workingWeights: Record<SSLiftKey, number>;
  // Per-lift consecutive failed sessions (0/1/2). Reaching 2 triggers a 10%
  // deload on that lift only; resets to 0 on a successful session or a deload.
  consecutiveFailures: Record<SSLiftKey, number>;
  // Per-lift lifetime count of deloads applied (history / insight).
  deloadHistory: Record<SSLiftKey, number>;
  // Per-lift microloading flag — true after that lift's first deload, switching
  // its per-session jump from the full to the reduced increment.
  microloadingActive: Record<SSLiftKey, boolean>;
  // Last workout completed; null before the first session. Drives A/B alternation.
  lastWorkout: "A" | "B" | null;
  // Total sessions completed across all phases.
  sessionCount: number;
  // ISO date the program was started; "" until set at onboarding.
  startDate: string;
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

// SS workingWeights default to 0 — the user enters real starting weights at
// onboarding (which also sets startDate). The store migration resets any
// pre-rebuild SS state to this default: the old shape is structurally
// incompatible and SS shipped no UI, so no user holds meaningful SS progress.
export const DEFAULT_STARTING_STRENGTH_STATE: StartingStrengthState = {
  currentPhase: 1,
  phaseSessionCount: 0,
  pullVariantPreference: "row",
  workingWeights: { squat: 0, press: 0, bench: 0, deadlift: 0, row: 0, powerClean: 0, chinUp: 0 },
  consecutiveFailures: { squat: 0, press: 0, bench: 0, deadlift: 0, row: 0, powerClean: 0, chinUp: 0 },
  deloadHistory: { squat: 0, press: 0, bench: 0, deadlift: 0, row: 0, powerClean: 0, chinUp: 0 },
  microloadingActive: {
    squat: false,
    press: false,
    bench: false,
    deadlift: false,
    row: false,
    powerClean: false,
    chinUp: false,
  },
  lastWorkout: null,
  sessionCount: 0,
  startDate: "",
};

export const DEFAULT_PROGRAMS_STATE: ProgramsState = {
  wendler531: DEFAULT_WENDLER531_STATE,
  texasMethod: DEFAULT_TEXAS_METHOD_STATE,
  startingStrength: DEFAULT_STARTING_STRENGTH_STATE,
};
