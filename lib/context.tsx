import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppData, DEFAULT_DATA, loadData, saveData, WorkoutLog, LiftData, Settings, ExtraSet } from "./store";
import { darkTheme, lightTheme, Theme } from "../constants/theme";
import {
  WeightUnit,
  DEFAULT_BAR,
  DEFAULT_PRECISION,
  defaultPlatesFor,
  convertWeight,
  precisionOptionsFor,
} from "./plates";
import { TimerProvider } from "./timer";
import { SHOW_IAP_UI } from "./config";

// When IAP UI is hidden, all gated flags behave as unlocked.
function applyIapOverrides(data: AppData): AppData {
  if (SHOW_IAP_UI) return data;
  return {
    ...data,
    settings: {
      ...data.settings,
      additionalLifts: true,
      adjustableSet: true,
      progressLog: true,
    },
  };
}

interface AppCtx {
  data: AppData;
  theme: Theme;
  updateSettings: (s: Partial<Settings>) => void;
  updateLift: (name: string, updates: Partial<LiftData>) => void;
  addLift: (lift: LiftData) => void;
  addWorkout: (workout: WorkoutLog) => void;
  deleteWorkout: (id: string) => void;
  setCurrentCycle: (n: number) => void;
  addExtraSet: (liftName: string, set: ExtraSet) => void;
  removeExtraSet: (liftName: string, index: number) => void;
  changeUnits: (next: WeightUnit) => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppCtx>({
  data: DEFAULT_DATA,
  theme: darkTheme,
  updateSettings: () => {},
  updateLift: () => {},
  addLift: () => {},
  addWorkout: () => {},
  deleteWorkout: () => {},
  setCurrentCycle: () => {},
  addExtraSet: () => {},
  removeExtraSet: () => {},
  changeUnits: () => {},
  reload: async () => {},
});

export function useApp() {
  return useContext(Ctx);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  const persist = useCallback(async (d: AppData) => {
    setData(d);
    await saveData(d);
  }, []);

  useEffect(() => {
    loadData().then((d) => { setData(applyIapOverrides(d)); setLoaded(true); });
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    const next = { ...data, settings: { ...data.settings, ...s } };
    persist(next);
  }, [data, persist]);

  const updateLift = useCallback((name: string, updates: Partial<LiftData>) => {
    const next = { ...data, lifts: data.lifts.map((l) => (l.name === name ? { ...l, ...updates } : l)) };
    persist(next);
  }, [data, persist]);

  const addLift = useCallback((lift: LiftData) => {
    persist({ ...data, lifts: [...data.lifts, lift] });
  }, [data, persist]);

  const addWorkout = useCallback((workout: WorkoutLog) => {
    persist({ ...data, workouts: [...data.workouts, workout] });
  }, [data, persist]);

  const deleteWorkout = useCallback((id: string) => {
    persist({ ...data, workouts: data.workouts.filter((w) => w.id !== id) });
  }, [data, persist]);

  const setCurrentCycle = useCallback((n: number) => {
    persist({ ...data, currentCycle: n });
  }, [data, persist]);

  const addExtraSet = useCallback((liftName: string, set: ExtraSet) => {
    const current = data.extraSets[liftName] || [];
    persist({ ...data, extraSets: { ...data.extraSets, [liftName]: [...current, set] } });
  }, [data, persist]);

  const removeExtraSet = useCallback((liftName: string, index: number) => {
    const current = data.extraSets[liftName] || [];
    persist({ ...data, extraSets: { ...data.extraSets, [liftName]: current.filter((_, i) => i !== index) } });
  }, [data, persist]);

  const changeUnits = useCallback((next: WeightUnit) => {
    const from = data.settings.units;
    if (from === next) return;
    const nextPrecision = DEFAULT_PRECISION[next];
    const nextBar = DEFAULT_BAR[next];
    const nextPlates = defaultPlatesFor(next);
    const rounding = data.settings.rounding;

    const lifts = data.lifts.map((l) => ({
      ...l,
      oneRepMax: convertWeight(l.oneRepMax, from, next, nextPrecision, rounding),
      trainingMax: l.trainingMax !== undefined ? convertWeight(l.trainingMax, from, next, nextPrecision, rounding) : undefined,
    }));
    const workouts = data.workouts.map((w) => ({
      ...w,
      sets: w.sets.map((s) => ({
        ...s,
        weight: convertWeight(s.weight, from, next, nextPrecision, rounding),
      })),
    }));

    const currentPrecision = data.settings.precision;
    const validForNext = precisionOptionsFor(next).includes(currentPrecision);

    persist({
      ...data,
      lifts,
      workouts,
      settings: {
        ...data.settings,
        units: next,
        barWeight: nextBar,
        availablePlates: nextPlates,
        precision: validForNext ? currentPrecision : nextPrecision,
      },
    });
  }, [data, persist]);

  const reload = useCallback(async () => { const d = await loadData(); setData(applyIapOverrides(d)); }, []);

  const theme = data.settings.darkMode ? darkTheme : lightTheme;
  if (!loaded) return null;

  return (
    <Ctx.Provider value={{ data, theme, updateSettings, updateLift, addLift, addWorkout, deleteWorkout, setCurrentCycle, addExtraSet, removeExtraSet, changeUnits, reload }}>
      <TimerProvider defaultDuration={data.settings.restTimerDuration}>
        {children}
      </TimerProvider>
    </Ctx.Provider>
  );
}
