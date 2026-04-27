import { buildSampleWorkouts, stripSampleWorkouts, sampleTMForCycle } from "./sampleData";
import type { WorkoutLog } from "./store";

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, detail: (e as Error).message });
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const PRECISION = 5;
const ROUNDING = "nearest" as const;
const workouts = buildSampleWorkouts(PRECISION, ROUNDING);

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

// 1. Count
check("1. produces exactly 144 workouts", () => {
  assert(workouts.length === 144, `expected 144, got ${workouts.length}`);
});

// 2. Cycle 1 starting TMs (via helper — the weight in workouts is % of TM, so test TM fn directly)
check("2a. Squat cycle 1 TM = 275", () => {
  const tm = sampleTMForCycle("Squat", 1);
  assert(tm === 275, `expected 275, got ${tm}`);
});
check("2b. Bench Press cycle 1 TM = 185", () => {
  const tm = sampleTMForCycle("Bench Press", 1);
  assert(tm === 185, `expected 185, got ${tm}`);
});
check("2c. Deadlift cycle 1 TM = 315", () => {
  const tm = sampleTMForCycle("Deadlift", 1);
  assert(tm === 315, `expected 315, got ${tm}`);
});
check("2d. Overhead Press cycle 1 TM = 115", () => {
  const tm = sampleTMForCycle("Overhead Press", 1);
  assert(tm === 115, `expected 115, got ${tm}`);
});

// 3. Cycle 9 Squat TM reset to 340
check("3. Cycle 9 Squat TM = 340 (post-fail reset)", () => {
  const tm = sampleTMForCycle("Squat", 9);
  assert(tm === 340, `expected 340, got ${tm}`);
});

// 4. Cycle 12 Week 3 most recent, ~3 days ago
check("4. Cycle 12 Week 3 first session is ~3 days ago", () => {
  const c12w3 = workouts.filter((w) => w.cycle === 12 && w.week === "5/3/1");
  assert(c12w3.length === 4, `expected 4 lifts in C12W3, got ${c12w3.length}`);
  c12w3.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = new Date(c12w3[0].date).getTime();
  const ageDays = (Date.now() - first) / DAY;
  // sessionStart for C12W3 = Date.now() - 3 days. Squat (li=0) is at sessionStart.
  assert(ageDays > 2.9 && ageDays < 3.1, `expected ~3 days, got ${ageDays.toFixed(3)} days`);
});

check("4b. Cycle 12 Week 3 is chronologically last slot", () => {
  const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0];
  assert(
    latest.cycle === 12 && latest.week === "5/3/1",
    `latest workout was C${latest.cycle} ${latest.week}, expected C12 5/3/1`,
  );
});

// 5. Week-over-week stepping: same lift & week, cycle N-1 is 4 weeks earlier than cycle N
//    (3 AMRAP weeks + 1 deload slot = 4-week slot-stride)
check("5. Prior cycle same-week same-lift session is 4 weeks earlier", () => {
  const bad: string[] = [];
  const lifts = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
  const weeks = ["5/5/5", "3/3/3", "5/3/1"] as const;
  for (const lift of lifts) {
    for (const week of weeks) {
      for (let c = 2; c <= 12; c++) {
        const prev = workouts.find((w) => w.cycle === c - 1 && w.week === week && w.exercise === lift);
        const curr = workouts.find((w) => w.cycle === c && w.week === week && w.exercise === lift);
        assert(prev && curr, `missing C${c - 1} or C${c} ${lift} ${week}`);
        const delta = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / WEEK;
        if (Math.abs(delta - 4) > 0.01) {
          bad.push(`${lift} ${week} C${c - 1}→C${c}: ${delta.toFixed(3)}w`);
        }
      }
    }
  }
  assert(bad.length === 0, `non-4-week gaps: ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "..." : ""}`);
});

// Also check within-cycle week stepping: W1→W2→W3 is 1 week each
check("5b. Same-cycle same-lift W1→W2→W3 is 1 week stride", () => {
  const bad: string[] = [];
  const lifts = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
  const weekSeq = ["5/5/5", "3/3/3", "5/3/1"] as const;
  for (const lift of lifts) {
    for (let c = 1; c <= 12; c++) {
      for (let i = 1; i < weekSeq.length; i++) {
        const prev = workouts.find((w) => w.cycle === c && w.week === weekSeq[i - 1] && w.exercise === lift);
        const curr = workouts.find((w) => w.cycle === c && w.week === weekSeq[i] && w.exercise === lift);
        assert(prev && curr, `missing C${c} ${lift} ${weekSeq[i - 1]}/${weekSeq[i]}`);
        const delta = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / WEEK;
        if (Math.abs(delta - 1) > 0.01) {
          bad.push(`C${c} ${lift} ${weekSeq[i - 1]}→${weekSeq[i]}: ${delta.toFixed(3)}w`);
        }
      }
    }
  }
  assert(bad.length === 0, `non-1-week gaps: ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "..." : ""}`);
});

// 6. Total span ~48 weeks
check("6. Date range spans ~48 weeks (tolerance 45–50)", () => {
  const times = workouts.map((w) => new Date(w.date).getTime());
  const span = (Math.max(...times) - Math.min(...times)) / WEEK;
  assert(span >= 45 && span <= 50, `span = ${span.toFixed(2)} weeks (actual, outside 45–50)`);
});

// 7. No NaN/undefined weights
check("7. No NaN or undefined weights in any set", () => {
  const bad: string[] = [];
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.weight === undefined || s.weight === null || Number.isNaN(s.weight)) {
        bad.push(`${w.id}: weight=${s.weight}`);
      }
    }
  }
  assert(bad.length === 0, `bad weights: ${bad.slice(0, 3).join("; ")}`);
});

// 8. Every entry has _isSampleData: true
check("8. Every workout has _isSampleData: true", () => {
  const bad = workouts.filter((w) => w._isSampleData !== true);
  assert(bad.length === 0, `${bad.length} workouts missing flag`);
});

// --- stripSampleWorkouts tests ---

const real1: WorkoutLog = {
  id: "real-1",
  date: "2026-01-01T00:00:00.000Z",
  exercise: "Squat",
  week: "5/5/5",
  cycle: 1,
  sets: [],
  notes: "",
};
const real2: WorkoutLog = {
  id: "real-2",
  date: "2026-01-08T00:00:00.000Z",
  exercise: "Bench Press",
  week: "3/3/3",
  cycle: 1,
  sets: [],
  notes: "",
  _isSampleData: false,
};
const fake1: WorkoutLog = {
  id: "sample-1",
  date: "2026-01-02T00:00:00.000Z",
  exercise: "Deadlift",
  week: "5/3/1",
  cycle: 1,
  sets: [],
  notes: "",
  _isSampleData: true,
};
const fake2: WorkoutLog = {
  id: "sample-2",
  date: "2026-01-03T00:00:00.000Z",
  exercise: "Overhead Press",
  week: "5/5/5",
  cycle: 1,
  sets: [],
  notes: "",
  _isSampleData: true,
};

const mixed: WorkoutLog[] = [real1, fake1, real2, fake2];
const stripped = stripSampleWorkouts(mixed);

check("strip.1. Only _isSampleData:true entries removed", () => {
  assert(stripped.length === 2, `expected 2 remaining, got ${stripped.length}`);
  const ids = new Set(stripped.map((w) => w.id));
  assert(!ids.has("sample-1") && !ids.has("sample-2"), "sample entries still present");
});

check("strip.2. Real workouts (flag=false or undefined) preserved", () => {
  const ids = new Set(stripped.map((w) => w.id));
  assert(ids.has("real-1"), "real-1 (undefined flag) missing");
  assert(ids.has("real-2"), "real-2 (flag=false) missing");
});

// --- Report ---
console.log("\n=== Test Results ===");
let passed = 0;
let failed = 0;
for (const r of results) {
  if (r.pass) {
    console.log(`  PASS  ${r.name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${r.name}`);
    console.log(`        → ${r.detail}`);
    failed++;
  }
}
console.log(`\n${passed} passed, ${failed} failed, ${results.length} total`);
process.exit(failed === 0 ? 0 : 1);
