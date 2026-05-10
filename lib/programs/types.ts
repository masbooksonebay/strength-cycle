// Program registry shared types.
// Each supported program (5/3/1, Texas Method, future Starting Strength etc.)
// owns its own state slice under AppData.programs[id] and contributes
// metadata + a small set of pure helpers via this interface.

export type ProgramId = "wendler531" | "texasMethod";

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

export interface ProgramsState {
  wendler531: Wendler531State;
  texasMethod: TexasMethodState;
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

export const DEFAULT_PROGRAMS_STATE: ProgramsState = {
  wendler531: DEFAULT_WENDLER531_STATE,
  texasMethod: DEFAULT_TEXAS_METHOD_STATE,
};
