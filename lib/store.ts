import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WeightUnit,
  RoundingMode,
  DEFAULT_BAR,
  DEFAULT_PRECISION,
  defaultPlatesFor,
  localeDefaultUnit,
} from "./plates";
import {
  ProgramId,
  ProgramsState,
  DEFAULT_PROGRAMS_STATE,
  DEFAULT_STARTING_STRENGTH_STATE,
  isProgramId,
  Wendler531State,
  TexasMethodState,
  StartingStrengthState,
} from "./programs";

export interface LiftData {
  name: string;
  oneRepMax: number;
  notes: string;
  isCustom: boolean;
  trainingMax?: number;
}

export interface ExtraSet {
  percentage: number;
  reps: number;
}

export interface SetLog {
  percentage: number;
  weight: number;
  targetReps: string;
  actualReps: number;
  isAmrap: boolean;
  isWarmup: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string;
  exercise: string;
  week: string;
  cycle: number;
  sets: SetLog[];
  notes: string;
  program?: ProgramId;
  _isSampleData?: boolean;
}

export interface Settings {
  precision: number;
  rounding: RoundingMode;
  tmPercentage: number;
  preventSleep: boolean;
  markSetsAsDone: boolean;
  restTimerDuration: number;
  darkMode: boolean;
  additionalLifts: boolean;
  adjustableSet: boolean;
  plateCalculator: boolean;
  progressLog: boolean;
  units: WeightUnit;
  barWeight: number;
  availablePlates: number[];
}

export interface AppData {
  activeProgram: ProgramId;
  programs: ProgramsState;
  lifts: LiftData[];
  workouts: WorkoutLog[];
  settings: Settings;
  extraSets: Record<string, ExtraSet[]>;
  onboardingComplete: boolean;
}

const STORAGE_KEY = "strength_cycle_data";

export const DEFAULT_SETTINGS: Settings = {
  precision: DEFAULT_PRECISION.lb,
  rounding: "nearest",
  tmPercentage: 90,
  preventSleep: true,
  markSetsAsDone: true,
  restTimerDuration: 180,
  darkMode: true,
  additionalLifts: false,
  adjustableSet: false,
  plateCalculator: true,
  progressLog: false,
  units: "lb",
  barWeight: DEFAULT_BAR.lb,
  availablePlates: defaultPlatesFor("lb"),
};

export const DEFAULT_LIFTS: LiftData[] = [
  { name: "Squat", oneRepMax: 100, notes: "", isCustom: false },
  { name: "Bench Press", oneRepMax: 100, notes: "", isCustom: false },
  { name: "Deadlift", oneRepMax: 100, notes: "", isCustom: false },
  { name: "Overhead Press", oneRepMax: 100, notes: "", isCustom: false },
];

export const DEFAULT_DATA: AppData = {
  activeProgram: "wendler531",
  programs: DEFAULT_PROGRAMS_STATE,
  lifts: DEFAULT_LIFTS,
  workouts: [],
  settings: DEFAULT_SETTINGS,
  extraSets: {},
  onboardingComplete: false,
};

function migrateSettings(raw: any): Settings {
  const merged: any = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (raw && raw.weightPrecision !== undefined && raw.precision === undefined) {
    merged.precision = raw.weightPrecision;
  }
  delete merged.weightPrecision;
  if (merged.plateCalculator !== true) merged.plateCalculator = true;
  if (!Array.isArray(merged.availablePlates)) {
    merged.availablePlates = defaultPlatesFor(merged.units);
  }
  return merged as Settings;
}

function migrateWorkouts(parsed: any): WorkoutLog[] {
  if (Array.isArray(parsed.workouts)) {
    return parsed.workouts.map((w: any) => ({
      ...w,
      program: isProgramId(w.program) ? w.program : "wendler531",
    }));
  }
  if (!Array.isArray(parsed.log) || parsed.log.length === 0) return [];
  const currentCycle = typeof parsed.currentCycle === "number" ? parsed.currentCycle : 1;
  const groups = new Map<string, any[]>();
  for (const e of parsed.log) {
    if (!e || typeof e !== "object") continue;
    const dateKey = String(e.date || "").slice(0, 10);
    const key = `${dateKey}|${e.exercise}|${e.week}`;
    const arr = groups.get(key) || [];
    arr.push(e);
    groups.set(key, arr);
  }
  const out: WorkoutLog[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    out.push({
      id: first.id || `${first.date}-${first.exercise}`,
      date: first.date,
      exercise: first.exercise,
      week: first.week,
      cycle: currentCycle,
      program: "wendler531",
      sets: group.map((e) => ({
        percentage: e.percentage,
        weight: e.weight,
        targetReps: String(e.targetReps ?? e.actualReps ?? ""),
        actualReps: Number(e.actualReps) || 0,
        isAmrap: typeof e.targetReps === "string" && e.targetReps.endsWith("+"),
        isWarmup: false,
      })),
      notes: group.map((e) => e.notes).filter(Boolean).join(" · "),
    });
  }
  out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return out;
}

function migratePrograms(parsed: any): { activeProgram: ProgramId; programs: ProgramsState } {
  const activeProgram: ProgramId = isProgramId(parsed.activeProgram) ? parsed.activeProgram : "wendler531";

  const wendler531State: Wendler531State = {
    currentCycle:
      typeof parsed.programs?.wendler531?.currentCycle === "number"
        ? parsed.programs.wendler531.currentCycle
        : typeof parsed.currentCycle === "number"
          ? parsed.currentCycle
          : 1,
  };

  const tmRaw = parsed.programs?.texasMethod ?? {};
  const texasMethodState: TexasMethodState = {
    weekIndex: typeof tmRaw.weekIndex === "number" ? tmRaw.weekIndex : 1,
    intensityWeights:
      typeof tmRaw.intensityWeights === "object" && tmRaw.intensityWeights !== null ? tmRaw.intensityWeights : {},
    stallCount: typeof tmRaw.stallCount === "object" && tmRaw.stallCount !== null ? tmRaw.stallCount : {},
    pendingStallChoice:
      tmRaw.pendingStallChoice && typeof tmRaw.pendingStallChoice === "object"
        ? tmRaw.pendingStallChoice
        : null,
    powerCleanEnabled: typeof tmRaw.powerCleanEnabled === "boolean" ? tmRaw.powerCleanEnabled : false,
    bodyweight: typeof tmRaw.bodyweight === "number" ? tmRaw.bodyweight : 0,
  };

  // Starting Strength (added in 1.0.4): mirrors the TM migration shape — if the
  // user has never activated SS, we backfill the default state so the type stays
  // total (`ProgramsState.startingStrength: StartingStrengthState`, not optional)
  // without disrupting anything. activeProgram is preserved, so existing 5/3/1
  // and TM users see no behavioural change.
  const ssRaw = parsed.programs?.startingStrength ?? {};
  const ssWorkingWeights =
    ssRaw.workingWeights && typeof ssRaw.workingWeights === "object"
      ? ssRaw.workingWeights
      : DEFAULT_STARTING_STRENGTH_STATE.workingWeights;
  const ssStallCounts =
    ssRaw.stallCounts && typeof ssRaw.stallCounts === "object"
      ? ssRaw.stallCounts
      : DEFAULT_STARTING_STRENGTH_STATE.stallCounts;
  const ssIncrementAdjusted =
    ssRaw.incrementAdjusted && typeof ssRaw.incrementAdjusted === "object"
      ? ssRaw.incrementAdjusted
      : DEFAULT_STARTING_STRENGTH_STATE.incrementAdjusted;
  const startingStrengthState: StartingStrengthState = {
    lastWorkout:
      ssRaw.lastWorkout === "A" || ssRaw.lastWorkout === "B" ? ssRaw.lastWorkout : null,
    workingWeights: {
      squat:
        typeof ssWorkingWeights.squat === "number"
          ? ssWorkingWeights.squat
          : DEFAULT_STARTING_STRENGTH_STATE.workingWeights.squat,
      press:
        typeof ssWorkingWeights.press === "number"
          ? ssWorkingWeights.press
          : DEFAULT_STARTING_STRENGTH_STATE.workingWeights.press,
      bench:
        typeof ssWorkingWeights.bench === "number"
          ? ssWorkingWeights.bench
          : DEFAULT_STARTING_STRENGTH_STATE.workingWeights.bench,
      deadlift:
        typeof ssWorkingWeights.deadlift === "number"
          ? ssWorkingWeights.deadlift
          : DEFAULT_STARTING_STRENGTH_STATE.workingWeights.deadlift,
    },
    stallCounts: {
      squat: typeof ssStallCounts.squat === "number" ? ssStallCounts.squat : 0,
      press: typeof ssStallCounts.press === "number" ? ssStallCounts.press : 0,
      bench: typeof ssStallCounts.bench === "number" ? ssStallCounts.bench : 0,
      deadlift: typeof ssStallCounts.deadlift === "number" ? ssStallCounts.deadlift : 0,
    },
    incrementAdjusted: {
      squat: ssIncrementAdjusted.squat === true,
      press: ssIncrementAdjusted.press === true,
      bench: ssIncrementAdjusted.bench === true,
      deadlift: ssIncrementAdjusted.deadlift === true,
    },
    sessionCount: typeof ssRaw.sessionCount === "number" ? ssRaw.sessionCount : 0,
  };

  return {
    activeProgram,
    programs: {
      wendler531: wendler531State,
      texasMethod: texasMethodState,
      startingStrength: startingStrengthState,
    },
  };
}

function firstLaunchDefaults(): AppData {
  const unit = localeDefaultUnit();
  // SS workingWeights default to the unit's bar weight (45 lb / 20 kg) so a
  // first-launch user who picks SS but skips entering numbers gets a sensible
  // empty-bar starting point in their own unit.
  const bar = DEFAULT_BAR[unit];
  return {
    ...DEFAULT_DATA,
    programs: {
      ...DEFAULT_DATA.programs,
      startingStrength: {
        ...DEFAULT_DATA.programs.startingStrength,
        workingWeights: { squat: bar, press: bar, bench: bar, deadlift: bar },
      },
    },
    settings: {
      ...DEFAULT_SETTINGS,
      units: unit,
      precision: DEFAULT_PRECISION[unit],
      barWeight: DEFAULT_BAR[unit],
      availablePlates: defaultPlatesFor(unit),
    },
  };
}

// Phase 5E migration: TestFlight builds 16-18 cached `programs.texasMethod.fiveRMs`
// when the user entered values via the (now-removed) 5RM-mode toggle. Single source
// of truth is now lifts[name].oneRepMax, so backfill any missing/zero 1RMs from the
// cached 5RM via × 1.176 (Epley inverse). Lifts that already have a real 1RM (e.g.
// from prior 5/3/1 onboarding) are left untouched. Idempotent: once the cached
// fiveRMs field is gone (not re-written by post-5E code), the backfill is a no-op.
function backfillOneRMsFromCachedFiveRMs(lifts: LiftData[], parsed: any): LiftData[] {
  const cachedFiveRMs = parsed?.programs?.texasMethod?.fiveRMs;
  if (!cachedFiveRMs || typeof cachedFiveRMs !== "object") return lifts;
  return lifts.map((l) => {
    const cached = cachedFiveRMs[l.name];
    if (typeof cached !== "number" || cached <= 0) return l;
    if (l.oneRepMax > 0 && l.oneRepMax !== 100) return l; // user already set a real 1RM
    return { ...l, oneRepMax: Math.round(cached * 1.176) };
  });
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const workouts = migrateWorkouts(parsed);
      const { activeProgram, programs } = migratePrograms(parsed);
      const onboardingComplete =
        typeof parsed.onboardingComplete === "boolean"
          ? parsed.onboardingComplete
          : workouts.length > 0 || (Array.isArray(parsed.log) && parsed.log.length > 0);

      const { log: _legacyLog, currentCycle: _legacyCycle, ...rest } = parsed;
      const merged: AppData = {
        ...DEFAULT_DATA,
        ...rest,
        activeProgram,
        programs,
        workouts,
        onboardingComplete,
        settings: migrateSettings(parsed.settings),
      };
      merged.lifts = backfillOneRMsFromCachedFiveRMs(merged.lifts, parsed);
      return merged;
    }
  } catch {}
  return firstLaunchDefaults();
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function exportData(): Promise<string> {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

export async function importData(json: string): Promise<AppData> {
  const data = JSON.parse(json) as AppData;
  await saveData(data);
  return data;
}

export function getLastReps(workouts: WorkoutLog[], exercise: string, week: string, percentage: number): { reps: number; weight: number } | null {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (w.exercise !== exercise || w.week !== week) continue;
    for (const s of w.sets) {
      if (s.percentage === percentage && s.actualReps > 0) return { reps: s.actualReps, weight: s.weight };
    }
  }
  return null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
