import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

interface TimerCtx {
  seconds: number;
  duration: number;
  running: boolean;
  visible: boolean;
  start: (override?: number) => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  restart: () => void;
  adjust: (delta: number) => void;
  setDuration: (d: number) => void;
  show: () => void;
  hide: () => void;
}

const Ctx = createContext<TimerCtx>({
  seconds: 0,
  duration: 180,
  running: false,
  visible: false,
  start: () => {},
  pause: () => {},
  toggle: () => {},
  reset: () => {},
  restart: () => {},
  adjust: () => {},
  setDuration: () => {},
  show: () => {},
  hide: () => {},
});

export function useTimer() {
  return useContext(Ctx);
}

export function TimerProvider({ children, defaultDuration }: { children: React.ReactNode; defaultDuration: number }) {
  const [duration, setDurationState] = useState(defaultDuration);
  const [seconds, setSeconds] = useState(defaultDuration);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDurationState(defaultDuration);
    setSeconds((s) => (running ? s : defaultDuration));
  }, [defaultDuration]);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, seconds]);

  const start = useCallback((override?: number) => {
    const v = override ?? (seconds > 0 ? seconds : duration);
    setSeconds(v);
    setRunning(true);
    setVisible(true);
  }, [seconds, duration]);

  const pause = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => {
    if (running) setRunning(false);
    else {
      if (seconds === 0) setSeconds(duration);
      setRunning(true);
      setVisible(true);
    }
  }, [running, seconds, duration]);

  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(duration);
  }, [duration]);

  const restart = useCallback(() => {
    setSeconds(duration);
    setRunning(true);
    setVisible(true);
  }, [duration]);

  const adjust = useCallback((delta: number) => {
    setSeconds((s) => Math.max(0, s + delta));
  }, []);

  const setDuration = useCallback((d: number) => {
    setDurationState(d);
    if (!running) setSeconds(d);
  }, [running]);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => {
    setVisible(false);
    setRunning(false);
    setSeconds(duration);
  }, [duration]);

  return (
    <Ctx.Provider value={{ seconds, duration, running, visible, start, pause, toggle, reset, restart, adjust, setDuration, show, hide }}>
      {children}
    </Ctx.Provider>
  );
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
