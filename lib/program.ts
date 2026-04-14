// 5/3/1 Program Logic

export const MAIN_LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
export type MainLift = (typeof MAIN_LIFTS)[number];

export const WEEKS = ["5/5/5", "3/3/3", "5/3/1", "Deload"] as const;
export type Week = (typeof WEEKS)[number];

export interface ProgramSet {
  percentage: number;
  reps: number | string; // string for AMRAP like "5+"
  isWarmup: boolean;
  isAmrap: boolean;
}

export const WEEK_SETS: Record<Week, ProgramSet[]> = {
  "5/5/5": [
    { percentage: 50, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 60, reps: 3, isWarmup: true, isAmrap: false },
    { percentage: 65, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 75, reps: 5, isWarmup: false, isAmrap: false },
    { percentage: 85, reps: "5+", isWarmup: false, isAmrap: true },
  ],
  "3/3/3": [
    { percentage: 50, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 60, reps: 3, isWarmup: true, isAmrap: false },
    { percentage: 70, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 80, reps: 3, isWarmup: false, isAmrap: false },
    { percentage: 90, reps: "3+", isWarmup: false, isAmrap: true },
  ],
  "5/3/1": [
    { percentage: 50, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 60, reps: 3, isWarmup: true, isAmrap: false },
    { percentage: 75, reps: 5, isWarmup: true, isAmrap: false },
    { percentage: 85, reps: 5, isWarmup: false, isAmrap: false },
    { percentage: 90, reps: 3, isWarmup: false, isAmrap: false },
    { percentage: 95, reps: "1+", isWarmup: false, isAmrap: true },
  ],
  Deload: [
    { percentage: 40, reps: 5, isWarmup: false, isAmrap: false },
    { percentage: 50, reps: 5, isWarmup: false, isAmrap: false },
    { percentage: 60, reps: 5, isWarmup: false, isAmrap: false },
  ],
};

export function roundWeight(weight: number, precision: number): number {
  return Math.round(weight / precision) * precision;
}

export function calcWeight(tm: number, percentage: number, precision: number): number {
  return roundWeight(tm * (percentage / 100), precision);
}

export function calcE1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function isUpperBody(lift: string): boolean {
  return lift === "Bench Press" || lift === "Overhead Press";
}

export function tmProgression(lift: string): number {
  return isUpperBody(lift) ? 5 : 10;
}

export function calcTM(oneRepMax: number, tmPercentage: number): number {
  return Math.round(oneRepMax * (tmPercentage / 100));
}

// Standard plate breakdown
const PLATES = [45, 35, 25, 10, 5, 2.5, 1.25, 1, 0.5, 0.25];
const BAR_WEIGHT = 45;

export function plateBreakdown(totalWeight: number): { plate: number; count: number }[] {
  let perSide = (totalWeight - BAR_WEIGHT) / 2;
  if (perSide <= 0) return [];
  const result: { plate: number; count: number }[] = [];
  for (const plate of PLATES) {
    const count = Math.floor(perSide / plate);
    if (count > 0) {
      result.push({ plate, count });
      perSide -= count * plate;
    }
  }
  return result;
}
