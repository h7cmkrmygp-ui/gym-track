export type Unit = 'kg' | 'lbs';

const KG_PER_LB = 0.45359237;

/** Weights are stored in kg at full precision; this gives the number to show, rounded to 0.1. */
export function toDisplay(kg: number, unit: Unit): number {
  const value = unit === 'kg' ? kg : kg / KG_PER_LB;
  return Math.round(value * 10) / 10;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function formatWeight(kg: number, unit: Unit): string {
  return `${toDisplay(kg, unit)} ${unit}`;
}

/** Increment used by the +/- buttons. */
export function weightStep(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5;
}
