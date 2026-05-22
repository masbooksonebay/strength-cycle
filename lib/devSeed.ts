// Dev-only seed helpers for App Store Connect screenshot prep.
// Wires up realistic history per the active program so the Track tab shows
// populated charts and tables for marketing screenshots. Forces units to kg so
// weights read as the kg values specified in the seed (regardless of the
// current Settings unit choice — gets switched back when the user resets via
// the Wipe button).

import { AppData, WorkoutLog, SetLog, generateId } from "./store";
import { ProgramId, ProgramsState } from "./programs";
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
const WENDLER_SEED_CYCLES = 3;

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
  for (let cycle = 1; cycle <= WENDLER_SEED_CYCLES; cycle++) {
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
// SS history is BACK-COMPUTED from the user's CURRENT working weights so the
// seed's end-state IS today's working weight — today's workout is the natural
// next linear-progression step, never a phantom PR jump (Wave I #13). The seed
// leaves workingWeights untouched and seeds history for ALL FOUR barbell lifts
// (the previous seed advanced squat only, leaving bench/deadlift/press to
// diverge from their onboarding values).
//
// Phase 1 A/B composition: A = Squat/Press/Deadlift, B = Squat/Bench/Deadlift.
// Squat and deadlift are trained every session; press only on A, bench only on
// B — so press/bench progress at half the per-session rate. One WorkoutLog per
// lift, week = "Workout A"/"Workout B", cycle = session number.
const SS_SEED_SESSIONS = 10;
const SS_SEED_INCREMENT_KG = 2.5; // full LP increment in kg (the seed forces kg)
const SS_SEED_FLOOR_KG = 20; // never back-compute below an empty barbell
// M/W/F cadence — day-ago offset per session, oldest first; newest = ~1 day ago.
const SS_SEED_DAYS_AGO = [22, 19, 17, 15, 12, 10, 8, 5, 3, 1];

type SSSeedLiftKey = "squat" | "press" | "bench" | "deadlift";
const SS_SEED_LIFT_NAME: Record<SSSeedLiftKey, string> = {
  squat: "Squat",
  press: "Overhead Press",
  bench: "Bench Press",
  deadlift: "Deadlift",
};
const SS_SEED_LIFT_SETS: Record<SSSeedLiftKey, number> = {
  squat: 3,
  press: 3,
  bench: 3,
  deadlift: 1,
};

// Back-computed weight for one appearance of a lift. `appearancesAfter` counts
// how many later seeded sessions also train this lift (0 = most recent). The
// most recent appearance sits exactly one increment below the current working
// weight, so today's workout AT the working weight is the natural next step.
function ssSeedWeight(currentWorkingWeight: number, appearancesAfter: number): number {
  const raw = currentWorkingWeight - (appearancesAfter + 1) * SS_SEED_INCREMENT_KG;
  return roundKg(Math.max(SS_SEED_FLOOR_KG, raw));
}

function buildStartingStrengthHistory(workingWeights: Record<string, number>): WorkoutLog[] {
  const aSessions = Math.ceil(SS_SEED_SESSIONS / 2); // count of Workout A sessions
  const bSessions = Math.floor(SS_SEED_SESSIONS / 2); // count of Workout B sessions
  const workouts: WorkoutLog[] = [];
  let aSeen = 0; // Workout A sessions already emitted
  let bSeen = 0; // Workout B sessions already emitted

  for (let i = 0; i < SS_SEED_SESSIONS; i++) {
    const sessionNumber = i + 1;
    const isA = sessionNumber % 2 === 1; // session 1 is Workout A
    const letter = isA ? "A" : "B";
    const date = isoDaysAgo(SS_SEED_DAYS_AGO[i]);
    const lifts: SSSeedLiftKey[] = isA
      ? ["squat", "press", "deadlift"]
      : ["squat", "bench", "deadlift"];

    for (const lift of lifts) {
      // appearancesAfter — later sessions that also train this lift. Squat and
      // deadlift appear every session; press on remaining A's, bench on B's.
      let appearancesAfter: number;
      if (lift === "squat" || lift === "deadlift") {
        appearancesAfter = SS_SEED_SESSIONS - sessionNumber;
      } else if (lift === "press") {
        appearancesAfter = aSessions - 1 - aSeen;
      } else {
        appearancesAfter = bSessions - 1 - bSeen;
      }
      const weight = ssSeedWeight(workingWeights[lift] ?? 0, appearancesAfter);
      workouts.push({
        id: generateId(),
        date,
        exercise: SS_SEED_LIFT_NAME[lift],
        week: `Workout ${letter}`,
        cycle: sessionNumber,
        sets: Array.from({ length: SS_SEED_LIFT_SETS[lift] }, () => ({
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

    if (isA) aSeen++;
    else bSeen++;
  }
  return workouts;
}

// Final Squat 1RM that reflects "where the seeded user's strength is now" for
// the two 1RM-driven programs.
// 5/3/1: cycle 3 TM = 90, divide by 0.9 → 100 (clean derivation).
// TM: final intensity 97.5, 1RM = 97.5 / 0.85 ≈ 114.7 → 115 kg.
// Starting Strength has no 1RM concept — it is excluded here and seeded via
// programs.startingStrength in buildSeedPatch instead.
const FINAL_SQUAT_1RM_KG: Record<"wendler531" | "texasMethod", number> = {
  wendler531: 100,
  texasMethod: 115,
};

export function buildSeedPatch(data: AppData, program: ProgramId): Partial<AppData> {
  // Starting Strength: SS tracks working weights, not 1RMs. Seed all four
  // barbell lifts' history, back-computed from the CURRENT working weights so
  // the seed end-state equals today's working weight (no phantom jump), and
  // leave workingWeights themselves untouched. sessionCount is advanced to the
  // seeded session count so the next logged workout continues the cycle
  // numbering instead of restarting at 1. lifts[].oneRepMax is left untouched
  // (SS never reads it).
  if (program === "startingStrength") {
    const ss = data.programs.startingStrength;
    return {
      workouts: buildStartingStrengthHistory(ss.workingWeights),
      programs: {
        ...data.programs,
        startingStrength: {
          ...ss,
          sessionCount: SS_SEED_SESSIONS,
          lastWorkout: SS_SEED_SESSIONS % 2 === 0 ? "B" : "A",
        },
      },
      settings: kgSettings(data.settings),
    };
  }

  // 5/3/1 and Texas Method: both drive off lifts[].oneRepMax (TM per Phase 5E).
  // The program's cycle / week counter is advanced past the seeded history so
  // the next logged workout continues the numbering instead of colliding at 1.
  const workouts =
    program === "wendler531" ? buildWendler531SquatHistory() : buildTexasMethodSquatHistory();
  const programs: ProgramsState =
    program === "wendler531"
      ? { ...data.programs, wendler531: { ...data.programs.wendler531, currentCycle: WENDLER_SEED_CYCLES + 1 } }
      : { ...data.programs, texasMethod: { ...data.programs.texasMethod, weekIndex: TM_SQUAT_WEEKS + 1 } };
  return {
    workouts,
    lifts: setSquatOneRM(data.lifts, FINAL_SQUAT_1RM_KG[program]),
    programs,
    settings: kgSettings(data.settings),
  };
}

export function buildWipePatch(data: AppData): Partial<AppData> {
  // Reset the per-program cycle / week / session counters too, so a wipe fully
  // undoes a prior seed (counters and history both return to a clean state).
  return {
    workouts: [],
    lifts: setSquatOneRM(data.lifts, STARTING_SQUAT_1RM_KG),
    programs: {
      ...data.programs,
      wendler531: { ...data.programs.wendler531, currentCycle: 1 },
      texasMethod: { ...data.programs.texasMethod, weekIndex: 1 },
      startingStrength: { ...data.programs.startingStrength, sessionCount: 0, lastWorkout: null },
    },
    settings: kgSettings(data.settings),
  };
}
