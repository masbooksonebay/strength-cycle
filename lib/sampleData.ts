import { WorkoutLog, SetLog } from "./store";
import { calcWeight } from "./program";
import { RoundingMode, WeightUnit } from "./plates";
import { ProgramId, TexasMethodState, DEFAULT_TEXAS_METHOD_STATE } from "./programs";
import { getDaySets, TM_LIFTS, TmDay, TmLift } from "./programs/texasMethod";

export const SAMPLE_DATA_ENABLED_KEY = "sc_dev_sample_data_enabled";

const DAY_MS = 24 * 60 * 60 * 1000;

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

// Program-aware sample-data entry point. 5/3/1 keeps its original 144-workout
// AMRAP history verbatim; Starting Strength and Texas Method get history shaped
// to their own canonical program model so the Track tab / History verify
// against real per-program data shapes (Wave G). `program` / `units` default to
// the 5/3/1 / lb pair so existing 2-arg callers (and the test) are unaffected.
export function buildSampleWorkouts(
  precision: number,
  rounding: RoundingMode,
  program: ProgramId = "wendler531",
  units: WeightUnit = "lb",
): WorkoutLog[] {
  if (program === "startingStrength") return buildStartingStrengthSampleWorkouts(units);
  if (program === "texasMethod") return buildTexasMethodSampleWorkouts(precision, rounding, units);

  // ── Wendler 5/3/1 — original behavior, unchanged ──────────────────────────
  const workouts: WorkoutLog[] = [];
  const dayMs = DAY_MS;
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
          program: "wendler531",
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

// ─── Starting Strength sample history ───────────────────────────────────────
// 9 sessions of Rippetoe novice linear progression, A/B alternating from A
// (Phase 1 ramp-up). Phase 1 composition: Workout A = Squat / Press / Deadlift,
// Workout B = Squat / Bench / Deadlift — squat and deadlift trained every
// session, press only on A, bench only on B. Every barbell lift adds a fixed
// per-session increment (5 lb / 2.5 kg). One WorkoutLog per lift, matching the
// live SS workout screen: week = "Workout A"/"Workout B", cycle = session number,
// 3x5 work sets (1x5 for deadlift), isAmrap = false on every barbell set.
const SS_SAMPLE_SESSIONS = 9;
const SS_SAMPLE_START: Record<WeightUnit, Record<"squat" | "press" | "bench" | "deadlift", number>> = {
  lb: { squat: 245, press: 95, bench: 165, deadlift: 315 },
  kg: { squat: 110, press: 42.5, bench: 75, deadlift: 142.5 },
};
const SS_SAMPLE_INCREMENT: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };
// M/W/F cadence — day-ago offset per session, oldest first; newest = ~1 day ago.
const SS_SAMPLE_DAYS_AGO = [19, 17, 15, 12, 10, 8, 5, 3, 1];

type SSSampleLiftKey = "squat" | "press" | "bench" | "deadlift";

function ssSampleSets(weight: number, count: number): SetLog[] {
  return Array.from({ length: count }, () => ({
    percentage: 100,
    weight,
    targetReps: "5",
    actualReps: 5,
    isAmrap: false,
    isWarmup: false,
  }));
}

export function buildStartingStrengthSampleWorkouts(units: WeightUnit): WorkoutLog[] {
  const start = SS_SAMPLE_START[units];
  const inc = SS_SAMPLE_INCREMENT[units];
  const workouts: WorkoutLog[] = [];
  // Per-lift occurrence counter — a lift's working weight only steps up on the
  // sessions it is actually trained, so press/bench progress at half the rate.
  const occurrences: Record<SSSampleLiftKey, number> = { squat: 0, press: 0, bench: 0, deadlift: 0 };

  for (let i = 0; i < SS_SAMPLE_SESSIONS; i++) {
    const sessionNumber = i + 1; // SS logs cycle = sessionCount + 1
    const isA = sessionNumber % 2 === 1; // first session is Workout A
    const letter = isA ? "A" : "B";
    const date = new Date(Date.now() - SS_SAMPLE_DAYS_AGO[i] * DAY_MS).toISOString();
    const lifts: { key: SSSampleLiftKey; name: string; sets: number }[] = isA
      ? [
          { key: "squat", name: "Squat", sets: 3 },
          { key: "press", name: "Overhead Press", sets: 3 },
          { key: "deadlift", name: "Deadlift", sets: 1 },
        ]
      : [
          { key: "squat", name: "Squat", sets: 3 },
          { key: "bench", name: "Bench Press", sets: 3 },
          { key: "deadlift", name: "Deadlift", sets: 1 },
        ];

    for (const l of lifts) {
      const weight = start[l.key] + occurrences[l.key] * inc;
      occurrences[l.key] += 1;
      workouts.push({
        id: `sample-ss-s${sessionNumber}-${l.key}`,
        date,
        exercise: l.name,
        week: `Workout ${letter}`,
        cycle: sessionNumber,
        program: "startingStrength",
        sets: ssSampleSets(weight, l.sets),
        notes: "",
        _isSampleData: true,
      });
    }
  }
  return workouts;
}

// ─── Texas Method sample history ────────────────────────────────────────────
// 4 weeks of the Volume / Recovery / Intensity weekly cycle. Each day's sets are
// produced by the canonical texasMethod.ts prescription helper (getDaySets) so
// the sample exactly matches what the live TM workout screen logs — same set
// counts, warmups, percentages, day labels, program tag, and cycle = weekIndex.
// Bench / Overhead Press alternate as the main upper-body lift by week parity;
// 5RMs progress one increment (5 lb / 2.5 kg) per week.
const TM_SAMPLE_WEEKS = 4;
const TM_SAMPLE_FIVE_RM: Record<WeightUnit, Record<TmLift, number>> = {
  lb: { Squat: 285, "Bench Press": 205, "Overhead Press": 130, Deadlift: 345 },
  kg: { Squat: 130, "Bench Press": 92.5, "Overhead Press": 60, Deadlift: 157.5 },
};

export function buildTexasMethodSampleWorkouts(
  precision: number,
  rounding: RoundingMode,
  units: WeightUnit,
): WorkoutLog[] {
  const inc = units === "lb" ? 5 : 2.5;
  const baseFiveRM = TM_SAMPLE_FIVE_RM[units];
  const workouts: WorkoutLog[] = [];
  // Within-week offsets: Volume (Mon), Recovery (Wed), Intensity (Fri). The
  // most recent week's Intensity Day lands ~1 day ago.
  const days: { day: TmDay; label: string; offset: number }[] = [
    { day: "volume", label: "Volume Day", offset: 4 },
    { day: "recovery", label: "Recovery Day", offset: 2 },
    { day: "intensity", label: "Intensity Day", offset: 0 },
  ];

  for (let w = 1; w <= TM_SAMPLE_WEEKS; w++) {
    // getCurrentFiveRM derives 5RM as oneRepMax * 0.85, so the synthetic lifts
    // carry oneRepMax = (week 5RM) / 0.85. Intensity Day reads intensityWeights
    // directly — seed it to the same per-week 5RM.
    const lifts = TM_LIFTS.map((name) => ({
      name,
      oneRepMax: (baseFiveRM[name] + (w - 1) * inc) / 0.85,
    }));
    const intensityWeights: Record<string, number> = {};
    for (const name of TM_LIFTS) intensityWeights[name] = baseFiveRM[name] + (w - 1) * inc;
    const state: TexasMethodState = {
      ...DEFAULT_TEXAS_METHOD_STATE,
      weekIndex: w,
      intensityWeights,
    };
    const weeksFromEnd = TM_SAMPLE_WEEKS - w; // newest week = 0

    for (const d of days) {
      const daysAgo = weeksFromEnd * 7 + d.offset + 1;
      const date = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
      for (const lift of TM_LIFTS) {
        const sets = getDaySets({ day: d.day, lift, state, lifts, precision, rounding });
        if (sets.length === 0) continue; // lift not trained that day
        workouts.push({
          id: `sample-tm-w${w}-${d.day}-${lift.replace(/\s+/g, "_")}`,
          date,
          exercise: lift,
          week: d.label,
          cycle: w,
          program: "texasMethod",
          sets: sets.map((set) => ({
            percentage: set.percentage,
            weight: set.weight ?? 0,
            targetReps: String(set.reps),
            actualReps: typeof set.reps === "number" ? set.reps : 5,
            isAmrap: set.isAmrap,
            isWarmup: set.isWarmup,
          })),
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
