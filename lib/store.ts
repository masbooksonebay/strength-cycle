import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export interface LiftData {
  name: string;
  trainingMax: number;
  notes: string;
  isCustom: boolean;
}

export interface LogEntry {
  id: string;
  date: string; // ISO string
  exercise: string;
  week: string;
  percentage: number;
  weight: number;
  targetReps: string;
  actualReps: number;
  notes: string;
}

export interface Settings {
  weightPrecision: number; // 2.5 or 5
  tmPercentage: number; // default 90
  preventSleep: boolean;
  markSetsAsDone: boolean;
  restTimerDuration: number; // seconds
  darkMode: boolean;
  // Paid features
  additionalExercises: boolean;
  adjustableSet: boolean;
  plateCalculator: boolean;
  progressLog: boolean;
}

export interface AppData {
  lifts: LiftData[];
  log: LogEntry[];
  settings: Settings;
  currentCycle: number;
}

const STORAGE_KEY = "strength_cycle_data";

export const DEFAULT_SETTINGS: Settings = {
  weightPrecision: 2.5,
  tmPercentage: 90,
  preventSleep: true,
  markSetsAsDone: true,
  restTimerDuration: 180,
  darkMode: true,
  additionalExercises: false,
  adjustableSet: false,
  plateCalculator: false,
  progressLog: false,
};

export const DEFAULT_LIFTS: LiftData[] = [
  { name: "Squat", trainingMax: 225, notes: "", isCustom: false },
  { name: "Bench Press", trainingMax: 185, notes: "", isCustom: false },
  { name: "Deadlift", trainingMax: 275, notes: "", isCustom: false },
  { name: "Overhead Press", trainingMax: 135, notes: "", isCustom: false },
];

export const DEFAULT_DATA: AppData = {
  lifts: DEFAULT_LIFTS,
  log: [],
  settings: DEFAULT_SETTINGS,
  currentCycle: 1,
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
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

export function getLastReps(log: LogEntry[], exercise: string, week: string, percentage: number): number | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.exercise === exercise && e.week === week && e.percentage === percentage) {
      return e.actualReps;
    }
  }
  return null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
