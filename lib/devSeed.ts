// Dev-only seed helpers for App Store Connect screenshot prep.
// Wires up realistic Squat history per the active program so the Track tab
// shows populated charts and tables for marketing screenshots. Forces units
// to kg so weights read as the kg values specified in the seed (regardless
// of the current Settings unit choice — gets switched back when the user
// resets via the Wipe button).

import { AppData, WorkoutLog, SetLog, generateId } from "./store";
import { ProgramId } from "./programs";
import { DEFAULT_PRECISION, DEFAULT_BAR, defaultPlatesFor } from "./plates";

const STARTING_SQUAT_1RM_KG = 90;

// Same kg-defaults shape that changeUnits applies on a unit switch — kept here
// so the seed is a single atomic patch (avoids racing with changeUnits' own
// persist call when the seed runs while units !== "kg").
function kgSettings(prev: AppData["settings"]): AppData["settings"] {
  return {
    ...prev,
    units: "kg",
    precision: DEFAULT_PRECISION.kg,
    barWeight: DEFAULT_BAR.kg,
    availablePlates: defaultPlatesFor("kg"),
  };
}

function setSquatOneRM(lifts: AppData["lifts"], kg: number): AppData["lifts"] {
  return lifts.map((l) => (l.name === "Squat" ? { ...l, oneRepMax: kg } : l));
}

// Round to nearest 1.25 kg (kg precision default). Matches what the live
// roundToPrecision helper would produce so seeded weights look like real
// Settings/precision-rounded outputs.
function roundKg(n: number): number {
  return Math.round(n / 1.25) * 1.25;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─── Wendler 5/3/1 ──────────────────────────────────────────────────────────
// 12 weeks (3 cycles × 4 weeks) of Squat. AMRAP top set on weeks 1-3 of each
// cycle; deload week 4 logged but no AMRAP (matches analytics filter).
//
// TM progression: cycle N TM = (90 × 0.9) + (N - 1) × 4.5 kg.
// Week percentages: 1=65/75/85, 2=70/80/90, 3=75/85/95, 4 (Deload)=40/50/60.
// AMRAP reps: cycle 1 = 8/6/5, cycle 2 = 7/5/4, cycle 3 = 6/4/3.
function buildWendler531SquatHistory(): WorkoutLog[] {
  const TM_BASE = STARTING_SQUAT_1RM_KG * 0.9; // 81 kg
  const TM_INC = 4.5; // lower-body cycle bump
  const WEEKS: { label: string; pcts: [number, number, number]; reps: [string, string, string]; amrap: boolean }[] = [
    { label: "5/5/5", pcts: [65, 75, 85], reps: ["5", "5", "5+"], amrap: true },
    { label: "3/3/3", pcts: [70, 80, 90], reps: ["3", "3", "3+"], amrap: true },
    { label: "5/3/1", pcts: [75, 85, 95], reps: ["5", "3", "1+"], amrap: true },
    { label: "Deload", pcts: [40, 50, 60], reps: ["5", "5", "5"], amrap: false },
  ];
  const AMRAP_REPS: Record<number, [number, number, number]> = {
    1: [8, 6, 5],
    2: [7, 5, 4],
    3: [6, 4, 3],
  };
  const workouts: WorkoutLog[] = [];
  let weekIndex = 0; // 0..11
  for (let cycle = 1; cycle <= 3; cycle++) {
    const tm = TM_BASE + (cycle - 1) * TM_INC;
    for (let w = 0; w < 4; w++) {
      const week = WEEKS[w];
      const daysAgo = (11 - weekIndex) * 7;
      const sets: SetLog[] = week.pcts.map((p, i) => {
        const isLast = i === 2;
        const isAmrap = isLast && week.amrap;
        const target = week.reps[i];
        const targetNumeric = parseInt(target, 10);
        const actualReps = isAmrap ? AMRAP_REPS[cycle][w] : targetNumeric;
        return {
          percentage: p,
          weight: roundKg((tm * p) / 100),
          targetReps: target,
          actualReps,
          isAmrap,
          isWarmup: false,
        };
      });
      workouts.push({
        id: generateId(),
        date: isoDaysAgo(daysAgo),
        exercise: "Squat",
        week: week.label,
        cycle,
        sets,
        notes: "",
        program: "wendler531",
      });
      weekIndex++;
    }
  }
  return workouts;
}

// ─── Texas Method ───────────────────────────────────────────────────────────
// 8 weeks of Volume + Intensity Day Squat. Volume Day = 5×5 work sets at the
// week's volume weight; Intensity Day = 1×5 PR attempt (isAmrap so the
// analytics intensityTableForLift / weeklyProgressionTable picks it up).
//
// Volume / Intensity weight progression per spec — Volume tracks behind
// Intensity by one PR step (real-world: Mon Volume reflects last Fri's PR).
function buildTexasMethodSquatHistory(): WorkoutLog[] {
  const VOLUME_WEIGHTS = [77.5, 80, 80, 82.5, 82.5, 85, 85, 87.5];
  const INTENSITY_WEIGHTS = [80, 82.5, 85, 87.5, 90, 92.5, 95, 97.5];
  const workouts: WorkoutLog[] = [];
  for (let w = 0; w < 8; w++) {
    const weekFromEndDays = (8 - w - 1) * 7;
    // Mon Volume sits 4 days before Fri Intensity within the same week.
    const volumeDate = isoDaysAgo(weekFromEndDays + 4);
    const intensityDate = isoDaysAgo(weekFromEndDays);
    const cycle = w + 1;

    const volSets: SetLog[] = Array.from({ length: 5 }, () => ({
      percentage: 90,
      weight: VOLUME_WEIGHTS[w],
      targetReps: "5",
      actualReps: 5,
      isAmrap: false,
      isWarmup: false,
    }));
    workouts.push({
      id: generateId(),
      date: volumeDate,
      exercise: "Squat",
      week: "Volume Day",
      cycle,
      sets: volSets,
      notes: "",
      program: "texasMethod",
    });

    workouts.push({
      id: generateId(),
      date: intensityDate,
      exercise: "Squat",
      week: "Intensity Day",
      cycle,
      sets: [{
        percentage: 100,
        weight: INTENSITY_WEIGHTS[w],
        targetReps: "5+",
        actualReps: 5,
        isAmrap: true,
        isWarmup: false,
      }],
      notes: "",
      program: "texasMethod",
    });
  }
  workouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return workouts;
}

// Final Squat 1RM that reflects "where the seeded user's strength is now."
// 5/3/1: cycle 3 TM = 90, divide by 0.9 → 100, but spec rounds to ~105.
//   Keep 100 (clean derivation). Spec's "~105" is approximate; 100 is closer
//   to the literal 3-cycle TM progression and renders better at 1.25 kg
//   precision.
// TM: final intensity 97.5, 1RM = 97.5 / 0.85 ≈ 114.7 → 115 kg.
// startingStrength entry is a placeholder — SS sample-data history + ASC seed
// flow lands in Wave 5 (screenshot prep). For now buildSeedPatch only branches
// between 5/3/1 and TM; SS will get its own history builder once it ships.
const FINAL_SQUAT_1RM_KG: Record<ProgramId, number> = {
  wendler531: 100,
  texasMethod: 115,
  startingStrength: 100,
};

export function buildSeedPatch(data: AppData, program: ProgramId): Partial<AppData> {
  const workouts =
    program === "wendler531" ? buildWendler531SquatHistory() : buildTexasMethodSquatHistory();
  return {
    workouts,
    lifts: setSquatOneRM(data.lifts, FINAL_SQUAT_1RM_KG[program]),
    settings: kgSettings(data.settings),
  };
}

export function buildWipePatch(data: AppData): Partial<AppData> {
  return {
    workouts: [],
    lifts: setSquatOneRM(data.lifts, STARTING_SQUAT_1RM_KG),
    settings: kgSettings(data.settings),
  };
}
