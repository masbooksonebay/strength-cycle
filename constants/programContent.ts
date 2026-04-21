export interface TechniqueContent {
  lift: string;
  setup: string[];
  execution: string[];
  mistakes: string[];
}

export const TECHNIQUE: TechniqueContent[] = [
  {
    lift: "Squat",
    setup: [
      "Bar positioned on upper traps (high bar) or rear delts (low bar) — low bar for powerlifting-style 5/3/1",
      "Feet shoulder-width to slightly wider, toes angled out 15–30°",
      "Hands grip bar tight, elbows down, chest up, big breath into belly before unrack",
    ],
    execution: [
      "Break at hips and knees simultaneously, not just knees",
      "Descend until hip crease is below top of knee (parallel or below)",
      "Knees track over toes, not caving inward",
      "Drive up through mid-foot and heel, chest leading",
    ],
    mistakes: [
      "Knees caving in on the way up (weak glutes/cues)",
      "Rounding lower back at the bottom (\"butt wink\") — reduce depth or mobility work",
      "Good-morning pattern on heavy sets (hips shoot up first) — re-focus on chest-leading",
    ],
  },
  {
    lift: "Bench Press",
    setup: [
      "Feet planted flat, shoulders retracted and pulled into bench, slight arch in upper back",
      "Grip roughly 1.5x shoulder width — find what puts forearms vertical at chest",
      "Unrack with straight arms, settle bar over shoulders before descending",
    ],
    execution: [
      "Lower bar under control to mid-chest (nipple line for most)",
      "Keep elbows tucked ~45–60° from torso, not flared to 90°",
      "Pause optional on heavy sets; paused reps build raw strength",
      "Drive bar up and slightly back toward face, not straight up",
    ],
    mistakes: [
      "Elbows flaring out to 90° — increases shoulder strain, reduces leverage",
      "Bouncing bar off chest — reduces training stimulus and risks injury",
      "Losing upper back tightness mid-set — reset between reps if needed",
    ],
  },
  {
    lift: "Deadlift",
    setup: [
      "Bar over mid-foot, close to shins",
      "Feet hip-width, toes slightly out (conventional) or wider (sumo — choose one style per cycle, don't alternate)",
      "Grip just outside knees, hips higher than knees, chest up, lats engaged (think \"bend the bar around you\")",
    ],
    execution: [
      "Take slack out of bar before pulling — feel the plates lift off slightly",
      "Push the floor away with legs first, bar stays in contact with shins and thighs",
      "Lock out with hips, not by leaning back; stand tall, don't hyperextend",
      "Control descent or drop (bumpers only)",
    ],
    mistakes: [
      "Lower back rounding under load — reduce weight, fix setup, consider mobility work",
      "Hips shooting up first (turning the lift into a stiff-leg deadlift) — re-cue \"push floor away with legs\"",
      "Jerking the bar off the floor — take slack out first, build tension before pull",
    ],
  },
  {
    lift: "Overhead Press",
    setup: [
      "Bar in front rack position, resting on shoulders with elbows slightly in front of bar",
      "Grip just outside shoulder-width, wrists stacked over elbows",
      "Feet hip-to-shoulder width, glutes and core braced hard (no leg drive on strict press)",
    ],
    execution: [
      "Press bar straight up, moving head back slightly to clear chin",
      "Once bar clears forehead, push head through — finish with bar over mid-foot, ears between arms",
      "Squeeze glutes throughout to prevent lower back hyperextension",
    ],
    mistakes: [
      "Leaning back excessively to press the bar — turns it into a standing incline press, strains lower back",
      "Bar drifting forward on the press — keep it vertical, push through the bar",
      "Soft core/glutes — bracing is what keeps the press strict and the lower back safe",
    ],
  },
];

export function techniqueForLift(liftName: string): TechniqueContent | null {
  const normalized = liftName.trim().toLowerCase();
  return TECHNIQUE.find((t) => t.lift.toLowerCase() === normalized) || null;
}

export interface LiftDescription {
  lift: string;
  body: string[];
}

export const LIFT_DESCRIPTIONS: LiftDescription[] = [
  {
    lift: "Squat",
    body: [
      "The foundational lower-body compound movement. Heavy squats drive total-body strength by loading the quads, glutes, hamstrings, and entire bracing system together.",
      "In 5/3/1, squats are typically the most technically demanding lift and the one most sensitive to sleep, food, and recovery — start the TM conservatively.",
    ],
  },
  {
    lift: "Bench Press",
    body: [
      "The primary upper-body horizontal press. Builds chest, anterior deltoids, and triceps, with significant contribution from the upper back for stability.",
      "In 5/3/1, expect bench to progress the slowest of the four lifts — plan for small, sustainable TM increases and lots of volume.",
    ],
  },
  {
    lift: "Deadlift",
    body: [
      "A full-body pull from the floor. Trains the posterior chain — glutes, hamstrings, spinal erectors — along with grip, lats, and core.",
      "Because the deadlift is so taxing, 5/3/1 intentionally keeps volume low on working sets. Don't add junk volume.",
    ],
  },
  {
    lift: "Overhead Press",
    body: [
      "The strict standing press — no leg drive. Trains shoulders, triceps, and upper chest, with the whole core working to keep the lift vertical.",
      "Progress slower than bench for most lifters. Small plates and patience are essential here.",
    ],
  },
];

export interface WeekDescription {
  week: string;
  rows: string[];
  note?: string;
}

export const WEEK_DESCRIPTIONS: WeekDescription[] = [
  {
    week: "Week 1 — 5/5/5+",
    rows: [
      "Warm-up: 50%×5, 60%×5, 65%×5",
      "Working sets: 75%×5, 85%×5+",
    ],
    note: "Final set is an AMRAP — aim to beat last cycle's rep count.",
  },
  {
    week: "Week 2 — 3/3/3+",
    rows: [
      "Warm-up: 50%×5, 60%×5, 70%×5",
      "Working sets: 80%×3, 90%×3+",
    ],
    note: "Heavier percentages but fewer reps. AMRAP on the top set.",
  },
  {
    week: "Week 3 — 5/3/1+",
    rows: [
      "Warm-up: 50%×5, 60%×5, 75%×5",
      "Working sets: 85%×5, 90%×3, 95%×1+",
    ],
    note: "The peak of the cycle — AMRAP at 95% TM. Treat it like a near-max.",
  },
  {
    week: "Week 4 — Deload",
    rows: [
      "Light sets: 40%×5, 50%×5, 60%×5",
    ],
    note: "Recovery week. No AMRAP. Don't chase reps — move well and rest.",
  },
];
