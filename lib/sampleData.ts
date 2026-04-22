import { WorkoutLog, SetLog } from "./store";
import { calcWeight } from "./program";
import { RoundingMode } from "./plates";

export const SAMPLE_DATA_ENABLED_KEY = "sc_dev_sample_data_enabled";

const LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
type LiftName = (typeof LIFTS)[number];

const STARTING_TM: Record<LiftName, number> = {
  Squat: 275,
  "Bench Press": 185,
  Deadlift: 315,
  "Overhead Press": 115,
};

const TM_INCREMENT: Record<LiftName, number> = {
  Squat: 10,
  "Bench Press": 5,
  Deadlift: 10,
  "Overhead Press": 5,
};

// Squat TM reset scenario: Cycle 8 AMRAP fails (3 reps on 5/3/1), so Cycle 9 resets to
// ~90% of Cycle 8 (345 → 340), then resumes +10/cycle.
export function sampleTMForCycle(lift: LiftName, cycle: number): number {
  const start = STARTING_TM[lift];
  const inc = TM_INCREMENT[lift];
  if (lift === "Squat" && cycle >= 9) {
    return 340 + (cycle - 9) * inc;
  }
  return start + (cycle - 1) * inc;
}

function hashSeed(cycle: number, key: string): number {
  let h = cycle * 2654435761;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function prngInt(seed: number, min: number, max: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 0x100000000;
  const next = (a * seed + c) >>> 0;
  const range = max - min + 1;
  return min + (next % range);
}

interface WeekDef {
  week: "5/5/5" | "3/3/3" | "5/3/1";
  pct: number;
  minReps: number;
  maxReps: number;
  targetReps: string;
}

const AMRAP_WEEKS: WeekDef[] = [
  { week: "5/5/5", pct: 85, minReps: 8, maxReps: 12, targetReps: "5+" },
  { week: "3/3/3", pct: 90, minReps: 5, maxReps: 7, targetReps: "3+" },
  { week: "5/3/1", pct: 95, minReps: 3, maxReps: 5, targetReps: "1+" },
];

export function buildSampleWorkouts(
  precision: number,
  rounding: RoundingMode,
): WorkoutLog[] {
  const workouts: WorkoutLog[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  // Cycle 12 Week 3 (5/3/1) = ~3 days ago. Each earlier (cycle, week) steps back 1 week.
  // Total span = 12 cycles * 3 weeks = 36 week-slots; with deload week between cycles,
  // effective calendar span is 12*4 = 48 weeks ≈ the requested ~52.
  const endTs = Date.now() - 3 * dayMs;
  const maxSlot = 11 * 4 + 2; // cycle 12 (index 11) × 4 + week index 2

  for (let c = 1; c <= 12; c++) {
    for (let wIdx = 0; wIdx < AMRAP_WEEKS.length; wIdx++) {
      const wk = AMRAP_WEEKS[wIdx];
      const slot = (c - 1) * 4 + wIdx;
      const weeksBack = maxSlot - slot;
      const sessionStart = endTs - weeksBack * weekMs;

      for (let li = 0; li < LIFTS.length; li++) {
        const lift = LIFTS[li];
        const tm = sampleTMForCycle(lift, c);
        const weight = calcWeight(tm, wk.pct, precision, rounding);

        let reps: number;
        if (lift === "Squat" && c === 8 && wk.week === "5/3/1") {
          reps = 3;
        } else {
          const seed = hashSeed(c, `${lift}|${wk.week}`);
          reps = prngInt(seed, wk.minReps, wk.maxReps);
        }

        const dateIso = new Date(sessionStart + li * dayMs).toISOString();

        const amrapSet: SetLog = {
          percentage: wk.pct,
          weight,
          targetReps: wk.targetReps,
          actualReps: reps,
          isAmrap: true,
          isWarmup: false,
        };

        workouts.push({
          id: `sample-c${c}-w${wIdx}-${lift.replace(/\s+/g, "_")}`,
          date: dateIso,
          exercise: lift,
          week: wk.week,
          cycle: c,
          sets: [amrapSet],
          notes: "",
          _isSampleData: true,
        });
      }
    }
  }

  workouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return workouts;
}

export function stripSampleWorkouts(workouts: WorkoutLog[]): WorkoutLog[] {
  return workouts.filter((w) => w._isSampleData !== true);
}
