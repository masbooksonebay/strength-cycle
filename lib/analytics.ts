import { WorkoutLog, SetLog } from "./store";
import { calcE1RM } from "./program";

export interface E1RMPoint {
  date: string;
  value: number;
  weight: number;
  reps: number;
  workoutId: string;
}

export function e1rmSeriesForLift(workouts: WorkoutLog[], lift: string): E1RMPoint[] {
  const points: E1RMPoint[] = [];
  for (const w of workouts) {
    if (w.exercise !== lift) continue;
    const amrap = w.sets.find((s) => s.isAmrap && s.actualReps > 0);
    if (!amrap) continue;
    points.push({
      date: w.date,
      value: calcE1RM(amrap.weight, amrap.actualReps),
      weight: amrap.weight,
      reps: amrap.actualReps,
      workoutId: w.id,
    });
  }
  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return points;
}

export interface TMPoint {
  cycle: number;
  tm: number;
}

// Derive TM in effect during each cycle for a given lift from AMRAP set weights.
// TM = weight / (percentage / 100), taking the first AMRAP encountered in the cycle.
export function tmSeriesForLift(workouts: WorkoutLog[], lift: string): TMPoint[] {
  const byCycle = new Map<number, number>();
  for (const w of workouts) {
    if (w.exercise !== lift) continue;
    if (byCycle.has(w.cycle)) continue;
    const ref = w.sets.find((s) => !s.isWarmup && s.actualReps > 0) || w.sets.find((s) => s.actualReps > 0);
    if (!ref || ref.percentage === 0) continue;
    byCycle.set(w.cycle, Math.round(ref.weight / (ref.percentage / 100)));
  }
  return Array.from(byCycle.entries()).map(([cycle, tm]) => ({ cycle, tm })).sort((a, b) => a.cycle - b.cycle);
}

export interface AmrapRow {
  cycle: number;
  w555?: number;
  w333?: number;
  w531?: number;
}

export function amrapTableForLift(workouts: WorkoutLog[], lift: string): AmrapRow[] {
  const byCycle = new Map<number, AmrapRow>();
  for (const w of workouts) {
    if (w.exercise !== lift) continue;
    const amrap = w.sets.find((s) => s.isAmrap && s.actualReps > 0);
    if (!amrap) continue;
    const row = byCycle.get(w.cycle) || { cycle: w.cycle };
    if (w.week === "5/5/5") row.w555 = amrap.actualReps;
    else if (w.week === "3/3/3") row.w333 = amrap.actualReps;
    else if (w.week === "5/3/1") row.w531 = amrap.actualReps;
    byCycle.set(w.cycle, row);
  }
  return Array.from(byCycle.values()).sort((a, b) => b.cycle - a.cycle);
}

export interface CycleWeekSnapshot {
  workout: WorkoutLog | null;
  topSet: SetLog | null;
  amrapSet: SetLog | null;
  topSetWeight: number | null;
  amrapReps: number | null;
  e1rm: number | null;
}

export function cycleWeekSnapshot(workouts: WorkoutLog[], lift: string, cycle: number, week: string): CycleWeekSnapshot {
  const workout = workouts.find((w) => w.exercise === lift && w.cycle === cycle && w.week === week) || null;
  if (!workout) return { workout: null, topSet: null, amrapSet: null, topSetWeight: null, amrapReps: null, e1rm: null };
  const working = workout.sets.filter((s) => !s.isWarmup);
  const amrapSet = working.find((s) => s.isAmrap && s.actualReps > 0) || null;
  const topSet = working.length ? working[working.length - 1] : null;
  return {
    workout,
    topSet,
    amrapSet,
    topSetWeight: topSet?.weight ?? null,
    amrapReps: amrapSet?.actualReps ?? null,
    e1rm: amrapSet ? calcE1RM(amrapSet.weight, amrapSet.actualReps) : null,
  };
}

export function uniqueCycles(workouts: WorkoutLog[]): number[] {
  const set = new Set<number>();
  for (const w of workouts) set.add(w.cycle);
  return Array.from(set).sort((a, b) => b - a);
}
