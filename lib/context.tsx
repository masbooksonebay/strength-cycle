import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppData, DEFAULT_DATA, loadData, saveData, LogEntry, LiftData, Settings, ExtraSet } from "./store";
import { darkTheme, lightTheme, Theme } from "../constants/theme";

interface AppCtx {
  data: AppData;
  theme: Theme;
  updateSettings: (s: Partial<Settings>) => void;
  updateLift: (name: string, updates: Partial<LiftData>) => void;
  addLift: (lift: LiftData) => void;
  addLogEntry: (entry: LogEntry) => void;
  setCurrentCycle: (n: number) => void;
  addExtraSet: (liftName: string, set: ExtraSet) => void;
  removeExtraSet: (liftName: string, index: number) => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppCtx>({
  data: DEFAULT_DATA,
  theme: darkTheme,
  updateSettings: () => {},
  updateLift: () => {},
  addLift: () => {},
  addLogEntry: () => {},
  setCurrentCycle: () => {},
  addExtraSet: () => {},
  removeExtraSet: () => {},
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
    loadData().then((d) => { setData(d); setLoaded(true); });
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

  const addLogEntry = useCallback((entry: LogEntry) => {
    persist({ ...data, log: [...data.log, entry] });
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

  const reload = useCallback(async () => { const d = await loadData(); setData(d); }, []);

  const theme = data.settings.darkMode ? darkTheme : lightTheme;
  if (!loaded) return null;

  return (
    <Ctx.Provider value={{ data, theme, updateSettings, updateLift, addLift, addLogEntry, setCurrentCycle, addExtraSet, removeExtraSet, reload }}>
      {children}
    </Ctx.Provider>
  );
}
