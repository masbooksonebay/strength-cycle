import { getLocales } from "expo-localization";

export type WeightUnit = "lb" | "kg";
export type RoundingMode = "nearest" | "down" | "up";

export interface BarPreset {
  label: string;
  weight: number;
}

export const BAR_PRESETS: Record<WeightUnit, BarPreset[]> = {
  lb: [
    { label: "Olympic", weight: 45 },
    { label: "Training", weight: 35 },
    { label: "Women's", weight: 33 },
    { label: "Technique", weight: 15 },
  ],
  kg: [
    { label: "Olympic", weight: 20 },
    { label: "Training", weight: 15 },
    { label: "Women's", weight: 15 },
    { label: "Technique", weight: 7 },
  ],
};

export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5, 1.25, 1, 0.5, 0.25];
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25];

export const PRECISION_OPTIONS_LB = [0.25, 0.5, 1.0, 2.5, 5.0];
export const PRECISION_OPTIONS_KG = [0.25, 0.5, 1.0, 1.25, 2.5, 5.0];

export const DEFAULT_PRECISION: Record<WeightUnit, number> = { lb: 2.5, kg: 1.25 };
export const DEFAULT_BAR: Record<WeightUnit, number> = { lb: 45, kg: 20 };

const IMPERIAL_REGIONS = new Set(["US", "LR", "MM"]);

export function localeDefaultUnit(): WeightUnit {
  try {
    const region = getLocales()[0]?.regionCode ?? null;
    return region && IMPERIAL_REGIONS.has(region) ? "lb" : "kg";
  } catch {
    return "lb";
  }
}

export function defaultPlatesFor(unit: WeightUnit): number[] {
  return unit === "lb" ? [...DEFAULT_PLATES_LB] : [...DEFAULT_PLATES_KG];
}

export function precisionOptionsFor(unit: WeightUnit): number[] {
  return unit === "lb" ? PRECISION_OPTIONS_LB : PRECISION_OPTIONS_KG;
}

function tidy(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function roundToPrecision(weight: number, precision: number, mode: RoundingMode = "nearest"): number {
  if (!precision || precision <= 0) return tidy(weight);
  const q = weight / precision;
  let k: number;
  if (mode === "down") k = Math.floor(q);
  else if (mode === "up") k = Math.ceil(q);
  else k = Math.round(q);
  return tidy(k * precision);
}

export interface PlateResult {
  rounded: number;
  perSide: number;
  plates: number[];
  leftover: number;
  belowBar: boolean;
}

export function calculatePlates(
  target: number,
  bar: number,
  availablePlates: number[],
  precision: number,
  mode: RoundingMode = "nearest",
): PlateResult {
  const rounded = roundToPrecision(target, precision, mode);
  const perSide = tidy((rounded - bar) / 2);
  if (perSide < 0) return { rounded, perSide, plates: [], leftover: 0, belowBar: true };
  if (perSide === 0) return { rounded, perSide: 0, plates: [], leftover: 0, belowBar: false };

  const sorted = [...availablePlates].filter((p) => p > 0).sort((a, b) => b - a);
  const plates: number[] = [];
  let remaining = perSide;
  const EPS = 1e-6;
  for (const p of sorted) {
    while (remaining + EPS >= p) {
      plates.push(p);
      remaining = tidy(remaining - p);
    }
  }
  return { rounded, perSide, plates, leftover: remaining, belowBar: false };
}

export function formatPlate(p: number): string {
  return Number.isInteger(p) ? String(p) : String(p);
}

export function formatPlateBreakdown(plates: number[]): string {
  if (plates.length === 0) return "";
  return plates.map(formatPlate).join(", ");
}

export function formatWeight(w: number): string {
  const r = tidy(w);
  return Number.isInteger(r) ? String(r) : String(r);
}

const LB_PER_KG = 2.2046226218;

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function convertWeight(
  weight: number,
  from: WeightUnit,
  to: WeightUnit,
  precision: number,
  mode: RoundingMode = "nearest",
): number {
  if (from === to) return weight;
  const raw = from === "lb" ? lbToKg(weight) : kgToLb(weight);
  return roundToPrecision(raw, precision, mode);
}
