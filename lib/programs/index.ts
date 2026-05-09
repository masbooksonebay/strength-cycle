// Program registry. Add new programs here once their module exists.

import { ProgramId, ProgramMetadata } from "./types";
import { WENDLER531_METADATA } from "./wendler531";
import { TEXAS_METHOD_METADATA } from "./texasMethod";

export * from "./types";

export const PROGRAM_IDS: ProgramId[] = ["wendler531", "texasMethod"];

export const PROGRAMS: Record<ProgramId, ProgramMetadata> = {
  wendler531: WENDLER531_METADATA,
  texasMethod: TEXAS_METHOD_METADATA,
};

export function programMetadata(id: ProgramId): ProgramMetadata {
  return PROGRAMS[id];
}

export function isProgramId(value: unknown): value is ProgramId {
  return value === "wendler531" || value === "texasMethod";
}
