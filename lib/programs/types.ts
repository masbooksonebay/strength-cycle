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

export interface TexasMethodState {
  weekIndex: number;
  // Intensity Day PR-attempt targets per lift. Diverges from oneRepMax-derived
  // 5RM as the user successfully PRs week over week. Reads fall back to the
  // derived 5RM when an entry is absent (fresh seed or new lift).
  intensityWeights: Record<string, number>;
  stallCount: Record<string, number>;
  pendingStallChoice: { lift: string; weight: number } | null;
  powerCleanEnabled: boolean;
  bodyweight: number;
}

// Starting Strength — Rippetoe novice linear progression. State is per-lift and
// history-driven (no week index): the only "where am I" signal is `lastWorkout`,
// which determines whether the next session is A or B.
export interface StartingStrengthState {
  // Last workout completed; null on first session before any workout.
  lastWorkout: "A" | "B" | null;
  // Current working weights per lift (in user's configured unit).
  workingWeights: {
    squat: number;
    press: number;
    bench: number;
    deadlift: number;
  };
  // Per-lift stall counter (Wave 1b will use this for deload triggers).
  stallCounts: {
    squat: number;
    press: number;
    bench: number;
    deadlift: number;
  };
  // Per-lift flag — true after first stall, switching to the smaller "post-stall"
  // increment for subsequent sessions (Rippetoe canonical: first stall drops the jump).
  incrementAdjusted: {
    squat: boolean;
    press: boolean;
    bench: boolean;
    deadlift: boolean;
  };
  // Total sessions completed under SS — drives Deadlift's early-phase taper
  // (first 6 sessions get +15 lb / +7.5 kg, then drops to +10 / +5 even with no stall).
  sessionCount: number;
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
};

export const DEFAULT_PROGRAMS_STATE: ProgramsState = {
  wendler531: DEFAULT_WENDLER531_STATE,
  texasMethod: DEFAULT_TEXAS_METHOD_STATE,
  startingStrength: DEFAULT_STARTING_STRENGTH_STATE,
};
