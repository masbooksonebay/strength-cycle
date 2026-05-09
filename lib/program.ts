// Compatibility shim — the canonical 5/3/1 logic now lives in
// lib/programs/wendler531.ts. This file re-exports those symbols so
// pre-existing imports (`from "../lib/program"`) keep working.
//
// New code should import from "../lib/programs" or its program-specific
// modules directly.

export {
  MAIN_LIFTS,
  WEEKS,
  WEEK_SETS,
  roundWeight,
  calcWeight,
  calcE1RM,
  isUpperBody,
  tmProgression,
  calcTM,
} from "./programs/wendler531";
export type { MainLift, Week } from "./programs/wendler531";
export type { ProgramSet } from "./programs/types";
