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
// 4 weeks of the Volume / Recovery / Intensity weekly cycle, squat only —
// squat is trained on all three TM days, so the seed is 3 squat WorkoutLogs
// per week (12 total). Volume Day = 5×5, Recovery Day = 2×5, Intensity Day =
// 1×5+ PR attempt (isAmrap so analytics intensityTableForLift /
// weeklyProgressionTable pick it up). Weights progress one 2.5 kg step per
// week; Volume / Recovery track behind Intensity (real-world: Mon Volume
// reflects last Fri's PR).
const TM_SQUAT_WEEKS = 4;
const TM_VOLUME_WEIGHTS = [80, 82.5, 85, 87.5];
const TM_RECOVERY_WEIGHTS = [65, 67.5, 70, 72.5];
const TM_INTENSITY_WEIGHTS = [90, 92.5, 95, 97.5];

function buildTexasMethodSquatHistory(): WorkoutLog[] {
  const workouts: WorkoutLog[] = [];
  for (let w = 0; w < TM_SQUAT_WEEKS; w++) {
    const weekFromEndDays = (TM_SQUAT_WEEKS - w - 1) * 7;
    const cycle = w + 1;
    // Within the week: Mon Volume / Wed Recovery / Fri Intensity. The most
    // recent week's Intensity Day lands ~1 day ago.
    const volSets: SetLog[] = Array.from({ length: 5 }, () => ({
      percentage: 90,
      weight: TM_VOLUME_WEIGHTS[w],
      targetReps: "5",
      actualReps: 5,
      isAmrap: false,
      isWarmup: false,
    }));
    workouts.push({
      id: generateId(),
      date: isoDaysAgo(weekFromEndDays + 5),
      exercise: "Squat",
      week: "Volume Day",
      cycle,
      sets: volSets,
      notes: "",
      program: "texasMethod",
    });

    const recSets: SetLog[] = Array.from({ length: 2 }, () => ({
      percentage: 80,
      weight: TM_RECOVERY_WEIGHTS[w],
      targetReps: "5",
      actualReps: 5,
      isAmrap: false,
      isWarmup: false,
    }));
    workouts.push({
      id: generateId(),
      date: isoDaysAgo(weekFromEndDays + 3),
      exercise: "Squat",
      week: "Recovery Day",
      cycle,
      sets: recSets,
      notes: "",
      program: "texasMethod",
    });

    workouts.push({
      id: generateId(),
      date: isoDaysAgo(weekFromEndDays + 1),
      exercise: "Squat",
      week: "Intensity Day",
      cycle,
      sets: [{
        percentage: 100,
        weight: TM_INTENSITY_WEIGHTS[w],
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

// ─── Starting Strength ───────────────────────────────────────────────────────
// 10 squat sessions of Rippetoe novice linear progression. SS opens both
// Workout A and B with the squat, so the seed is one squat WorkoutLog per
// session, A/B alternating from A. 3×5 work sets at a working weight that adds
// 2.5 kg per session — no AMRAP set (SS barbell lifts are not AMRAP). The week
// field ("Workout A"/"Workout B") and cycle (session number) match the live SS
// workout screen. SS has no 1RM concept — its source of truth is
// programs.startingStrength.workingWeights, advanced in buildSeedPatch.
const SS_SQUAT_SESSIONS = 10;
const SS_SQUAT_START_KG = 85;
const SS_SQUAT_INCREMENT_KG = 2.5;
// M/W/F cadence — day-ago offset per session, oldest first; newest = ~1 day ago.
const SS_SQUAT_DAYS_AGO = [22, 19, 17, 15, 12, 10, 8, 5, 3, 1];

function ssSquatFinalWorkingWeight(): number {
  return SS_SQUAT_START_KG + (SS_SQUAT_SESSIONS - 1) * SS_SQUAT_INCREMENT_KG;
}

function buildStartingStrengthSquatHistory(): WorkoutLog[] {
  const workouts: WorkoutLog[] = [];
  for (let i = 0; i < SS_SQUAT_SESSIONS; i++) {
    const sessionNumber = i + 1;
    const weight = SS_SQUAT_START_KG + i * SS_SQUAT_INCREMENT_KG;
    const letter = sessionNumber % 2 === 1 ? "A" : "B"; // first session is Workout A
    workouts.push({
      id: generateId(),
      date: isoDaysAgo(SS_SQUAT_DAYS_AGO[i]),
      exercise: "Squat",
      week: `Workout ${letter}`,
      cycle: sessionNumber,
      sets: Array.from({ length: 3 }, () => ({
        percentage: 100,
        weight,
        targetReps: "5",
        actualReps: 5,
        isAmrap: false,
        isWarmup: false,
      })),
      notes: "",
      program: "startingStrength",
    });
  }
  return workouts;
}

// Final Squat 1RM that reflects "where the seeded user's strength is now" for
// the two 1RM-driven programs.
// 5/3/1: cycle 3 TM = 90, divide by 0.9 → 100 (clean derivation).
// TM: final intensity 97.5, 1RM = 97.5 / 0.85 ≈ 114.7 → 115 kg.
// Starting Strength has no 1RM concept — it is excluded here and seeded via
// programs.startingStrength.workingWeights in buildSeedPatch instead.
const FINAL_SQUAT_1RM_KG: Record<"wendler531" | "texasMethod", number> = {
  wendler531: 100,
  texasMethod: 115,
};

export function buildSeedPatch(data: AppData, program: ProgramId): Partial<AppData> {
  // Starting Strength: SS tracks working weights, not 1RMs. Seed the squat
  // history and advance programs.startingStrength.workingWeights.squat to the
  // final session's weight — lifts[].oneRepMax is intentionally left untouched
  // (SS never reads it).
  if (program === "startingStrength") {
    return {
      workouts: buildStartingStrengthSquatHistory(),
      programs: {
        ...data.programs,
        startingStrength: {
          ...data.programs.startingStrength,
          workingWeights: {
            ...data.programs.startingStrength.workingWeights,
            squat: ssSquatFinalWorkingWeight(),
          },
        },
      },
      settings: kgSettings(data.settings),
    };
  }

  // 5/3/1 and Texas Method: both drive off lifts[].oneRepMax (TM per Phase 5E).
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
