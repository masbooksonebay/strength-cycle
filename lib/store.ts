import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WeightUnit,
  RoundingMode,
  DEFAULT_BAR,
  DEFAULT_PRECISION,
  defaultPlatesFor,
} from "./plates";

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
  lifts: LiftData[];
  workouts: WorkoutLog[];
  settings: Settings;
  currentCycle: number;
  extraSets: Record<string, ExtraSet[]>;
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
  lifts: DEFAULT_LIFTS,
  workouts: [],
  settings: DEFAULT_SETTINGS,
  currentCycle: 1,
  extraSets: {},
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
  if (Array.isArray(parsed.workouts)) return parsed.workouts;
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

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const workouts = migrateWorkouts(parsed);
      const { log: _legacyLog, ...rest } = parsed;
      return {
        ...DEFAULT_DATA,
        ...rest,
        workouts,
        settings: migrateSettings(parsed.settings),
      };
    }
  } catch {}
  return DEFAULT_DATA;
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

export function getLastReps(workouts: WorkoutLog[], exercise: string, week: string, percentage: number): number | null {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (w.exercise !== exercise || w.week !== week) continue;
    for (const s of w.sets) {
      if (s.percentage === percentage && s.actualReps > 0) return s.actualReps;
    }
  }
  return null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
