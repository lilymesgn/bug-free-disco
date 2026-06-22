// ============================================================
// Fit Tracker PRO — Unit Service
// Centralizes metric ↔ imperial conversion and display
// formatting. All data is always stored in metric (kg, cm, km)
// internally. This service converts values for display only.
// ============================================================

export type UnitSystem = 'metric' | 'imperial';

// ─── Conversions ──────────────────────────────────────────────────────────────
export const units = {
  // Weight: kg ↔ lbs
  kgToLbs: (kg: number) => Math.round(kg * 2.20462 * 10) / 10,
  lbsToKg: (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10,

  // Height: cm ↔ total inches (for storage)
  cmToInches: (cm: number) => Math.round(cm * 0.393701 * 10) / 10,
  inchesToCm: (inches: number) => Math.round((inches * 2.54) * 10) / 10,

  // Height: cm → "5′11″" display string
  cmToFtIn: (cm: number): string => {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${ft}′${inches}″`;
  },

  // Distance: km ↔ miles
  kmToMiles: (km: number) => Math.round(km * 0.621371 * 100) / 100,
  milesToKm: (miles: number) => Math.round((miles / 0.621371) * 100) / 100,
};

// ─── Display helpers ──────────────────────────────────────────────────────────
export function displayWeight(kg: number, system: UnitSystem): string {
  if (system === 'imperial') return `${units.kgToLbs(kg)} lbs`;
  return `${kg} kg`;
}

export function displayHeight(cm: number, system: UnitSystem): string {
  if (system === 'imperial') return units.cmToFtIn(cm);
  return `${cm} cm`;
}

export function displayDistance(km: number, system: UnitSystem): string {
  if (system === 'imperial') return `${units.kmToMiles(km).toFixed(2)} mi`;
  return `${km.toFixed(2)} km`;
}

export function weightLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'lbs' : 'kg';
}

export function heightLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'ft / in' : 'cm';
}

export function distanceLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'mi' : 'km';
}

// Convert a display value back to metric for storage
export function toStorageWeight(displayVal: number, system: UnitSystem): number {
  if (system === 'imperial') return units.lbsToKg(displayVal);
  return displayVal;
}

export function toStorageHeight(displayVal: number, system: UnitSystem): number {
  if (system === 'imperial') return units.inchesToCm(displayVal);
  return displayVal;
}

export function toDisplayWeight(kgVal: number, system: UnitSystem): number {
  if (system === 'imperial') return units.kgToLbs(kgVal);
  return kgVal;
}

export function toDisplayHeight(cmVal: number, system: UnitSystem): number {
  if (system === 'imperial') return units.cmToInches(cmVal);
  return cmVal;
}
