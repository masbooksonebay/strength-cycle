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

// ─── Texas Method ─────────────────────────────────────────────────────────
// TM stores `weekIndex` in the workout's `cycle` field. The Intensity Day
// PR attempt is logged with week === "Intensity Day" and the work set has
// isAmrap === true (PR attempt = AMRAP-equivalent in our schema).

export interface IntensityRow {
  week: number;
  weight: number;
  reps: number;
  e1rm: number;
}

// Per-week intensity-day PR result for a single lift. Returned in
// reverse-chronological order (most recent week first) to match the
// 5/3/1 amrapTableForLift convention.
export function intensityTableForLift(workouts: WorkoutLog[], lift: string): IntensityRow[] {
  const byWeek = new Map<number, IntensityRow>();
  for (const w of workouts) {
    if (w.program !== "texasMethod") continue;
    if (w.exercise !== lift) continue;
    if (w.week !== "Intensity Day") continue;
    const pr = w.sets.find((s) => s.isAmrap && s.actualReps > 0);
    if (!pr) continue;
    if (byWeek.has(w.cycle)) continue;
    byWeek.set(w.cycle, {
      week: w.cycle,
      weight: pr.weight,
      reps: pr.actualReps,
      e1rm: calcE1RM(pr.weight, pr.actualReps),
    });
  }
  return Array.from(byWeek.values()).sort((a, b) => b.week - a.week);
}

// Cross-lift weekly view: each row is one week, columns are each lift's
// Friday Intensity Day weight. `null` cell when that lift wasn't attempted
// that week (e.g. off-week upper-body lift).
export interface WeekRow {
  week: number;
  weights: Record<string, number | null>;
}

export function weeklyProgressionTable(workouts: WorkoutLog[], lifts: string[]): WeekRow[] {
  const byWeek = new Map<number, WeekRow>();
  for (const w of workouts) {
    if (w.program !== "texasMethod") continue;
    if (w.week !== "Intensity Day") continue;
    if (!lifts.includes(w.exercise)) continue;
    const pr = w.sets.find((s) => s.isAmrap && s.actualReps > 0);
    if (!pr) continue;
    let row = byWeek.get(w.cycle);
    if (!row) {
      row = { week: w.cycle, weights: Object.fromEntries(lifts.map((l) => [l, null])) };
      byWeek.set(w.cycle, row);
    }
    row.weights[w.exercise] = pr.weight;
  }
  return Array.from(byWeek.values()).sort((a, b) => b.week - a.week);
}

// All weeks present in TM workout history. Used for empty-state checks.
export function uniqueTMWeeks(workouts: WorkoutLog[]): number[] {
  const set = new Set<number>();
  for (const w of workouts) {
    if (w.program !== "texasMethod") continue;
    set.add(w.cycle);
  }
  return Array.from(set).sort((a, b) => b - a);
}
