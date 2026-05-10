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
import {
  ProgramId,
  ProgramsState,
  Wendler531State,
  TexasMethodState,
} from "./programs";

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
  updateWorkout: (id: string, updates: Partial<WorkoutLog>) => void;
  deleteWorkout: (id: string) => void;
  setCurrentCycle: (n: number) => void;
  setActiveProgram: (id: ProgramId) => void;
  switchProgram: (id: ProgramId) => void;
  updateWendler531State: (updates: Partial<Wendler531State>) => void;
  updateTexasMethodState: (updates: Partial<TexasMethodState>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  completeOnboarding: (patch: Partial<AppData>) => void;
  addExtraSet: (liftName: string, set: ExtraSet) => void;
  removeExtraSet: (liftName: string, index: number) => void;
  changeUnits: (next: WeightUnit) => void;
  replaceSampleWorkouts: (workouts: WorkoutLog[]) => void;
  clearSampleWorkouts: () => void;
  // Atomic merge for the __DEV__-only seed/wipe helpers in Settings.
  // Exposed on the context so dev seeds land in a single persist call (avoids
  // racing with multi-action chains like changeUnits → updateLift → addWorkout).
  applyDevPatch: (patch: Partial<AppData>) => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppCtx>({
  data: DEFAULT_DATA,
  theme: darkTheme,
  updateSettings: () => {},
  updateLift: () => {},
  addLift: () => {},
  addWorkout: () => {},
  updateWorkout: () => {},
  deleteWorkout: () => {},
  setCurrentCycle: () => {},
  setActiveProgram: () => {},
  switchProgram: () => {},
  updateWendler531State: () => {},
  updateTexasMethodState: () => {},
  setOnboardingComplete: () => {},
  completeOnboarding: () => {},
  addExtraSet: () => {},
  removeExtraSet: () => {},
  changeUnits: () => {},
  replaceSampleWorkouts: () => {},
  clearSampleWorkouts: () => {},
  applyDevPatch: () => {},
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
    const tagged: WorkoutLog = { ...workout, program: workout.program ?? data.activeProgram };
    persist({ ...data, workouts: [...data.workouts, tagged] });
  }, [data, persist]);

  const updateWorkout = useCallback((id: string, updates: Partial<WorkoutLog>) => {
    persist({ ...data, workouts: data.workouts.map((w) => (w.id === id ? { ...w, ...updates } : w)) });
  }, [data, persist]);

  const deleteWorkout = useCallback((id: string) => {
    persist({ ...data, workouts: data.workouts.filter((w) => w.id !== id) });
  }, [data, persist]);

  // Routes the legacy 5/3/1 currentCycle setter into the new programs.wendler531 slice.
  const setCurrentCycle = useCallback((n: number) => {
    persist({
      ...data,
      programs: {
        ...data.programs,
        wendler531: { ...data.programs.wendler531, currentCycle: n },
      },
    });
  }, [data, persist]);

  const setActiveProgram = useCallback((id: ProgramId) => {
    persist({ ...data, activeProgram: id });
  }, [data, persist]);

  // Atomic program switch (Phase 5B). Same shape as completeOnboarding —
  // single setState + persist, id passed in directly so no read-modify-write
  // and no closure-staleness if a caller chains follow-on actions in the
  // same tick. Both programs' state slices are preserved on switch.
  const switchProgram = useCallback((id: ProgramId) => {
    persist({ ...data, activeProgram: id });
  }, [data, persist]);

  const updateWendler531State = useCallback((updates: Partial<Wendler531State>) => {
    persist({
      ...data,
      programs: {
        ...data.programs,
        wendler531: { ...data.programs.wendler531, ...updates },
      },
    });
  }, [data, persist]);

  const updateTexasMethodState = useCallback((updates: Partial<TexasMethodState>) => {
    persist({
      ...data,
      programs: {
        ...data.programs,
        texasMethod: { ...data.programs.texasMethod, ...updates },
      },
    });
  }, [data, persist]);

  const setOnboardingComplete = useCallback((complete: boolean) => {
    persist({ ...data, onboardingComplete: complete });
  }, [data, persist]);

  // Atomic onboarding finalizer: merges program seed + activeProgram + lifts
  // into a single persist alongside onboardingComplete, sidestepping the
  // closure-staleness race that would otherwise occur if a caller invoked
  // updateTexasMethodState() and setOnboardingComplete() in the same tick.
  const completeOnboarding = useCallback((patch: Partial<AppData>) => {
    persist({ ...data, ...patch, onboardingComplete: true });
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

    const tm = data.programs.texasMethod;
    const convertWeightMap = (m: Record<string, number>): Record<string, number> =>
      Object.fromEntries(Object.entries(m).map(([k, v]) => [k, convertWeight(v, from, next, nextPrecision, rounding)]));
    const nextTm: TexasMethodState = {
      ...tm,
      intensityWeights: convertWeightMap(tm.intensityWeights),
      bodyweight: tm.bodyweight ? convertWeight(tm.bodyweight, from, next, nextPrecision, rounding) : 0,
    };

    const currentPrecision = data.settings.precision;
    const validForNext = precisionOptionsFor(next).includes(currentPrecision);

    persist({
      ...data,
      lifts,
      workouts,
      programs: { ...data.programs, texasMethod: nextTm },
      settings: {
        ...data.settings,
        units: next,
        barWeight: nextBar,
        availablePlates: nextPlates,
        precision: validForNext ? currentPrecision : nextPrecision,
      },
    });
  }, [data, persist]);

  const replaceSampleWorkouts = useCallback((newWorkouts: WorkoutLog[]) => {
    const real = data.workouts.filter((w) => w._isSampleData !== true);
    const merged = [...real, ...newWorkouts];
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    persist({ ...data, workouts: merged });
  }, [data, persist]);

  const clearSampleWorkouts = useCallback(() => {
    persist({ ...data, workouts: data.workouts.filter((w) => w._isSampleData !== true) });
  }, [data, persist]);

  const applyDevPatch = useCallback((patch: Partial<AppData>) => {
    persist({ ...data, ...patch });
  }, [data, persist]);

  const reload = useCallback(async () => { const d = await loadData(); setData(applyIapOverrides(d)); }, []);

  const theme = data.settings.darkMode ? darkTheme : lightTheme;
  if (!loaded) return null;

  return (
    <Ctx.Provider value={{
      data,
      theme,
      updateSettings,
      updateLift,
      addLift,
      addWorkout,
      updateWorkout,
      deleteWorkout,
      setCurrentCycle,
      setActiveProgram,
      switchProgram,
      updateWendler531State,
      updateTexasMethodState,
      setOnboardingComplete,
      completeOnboarding,
      addExtraSet,
      removeExtraSet,
      changeUnits,
      replaceSampleWorkouts,
      clearSampleWorkouts,
      applyDevPatch,
      reload,
    }}>
      <TimerProvider defaultDuration={data.settings.restTimerDuration}>
        {children}
      </TimerProvider>
    </Ctx.Provider>
  );
}
