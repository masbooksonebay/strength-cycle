// Wendler 5/3/1 — full program logic. This module owns the 5/3/1 set tables,
// progression rules, and metadata. The thin shim in lib/program.ts re-exports
// these symbols so all pre-existing imports keep working.

import { roundToPrecision, RoundingMode } from "../plates";
import { ProgramMetadata, ProgramSet } from "./types";

export const WENDLER531_METADATA: ProgramMetadata = {
  id: "wendler531",
  displayName: "Wendler 5/3/1",
  shortDescription: "Four-week cycles · AMRAP top sets · TM progression",
  longDescription:
    "Four-week cycles, AMRAP top sets, training max progression. Best for intermediate lifters.",
  methodology: "Jim Wendler's 5/3/1",
  cycleStructure: "four-week",
  primaryMetricLabel: "Training Max",
  primaryMetricAbbreviation: "TM",
};

export const MAIN_LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;
export type MainLift = (typeof MAIN_LIFTS)[number];

export const WEEKS = ["5/5/5", "3/3/3", "5/3/1", "Deload"] as const;
export type Week = (typeof WEEKS)[number];

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

export function roundWeight(weight: number, precision: number, mode: RoundingMode = "nearest"): number {
  return roundToPrecision(weight, precision, mode);
}

export function calcWeight(tm: number, percentage: number, precision: number, mode: RoundingMode = "nearest"): number {
  return roundToPrecision(tm * (percentage / 100), precision, mode);
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
