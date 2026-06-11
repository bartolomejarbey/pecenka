/** Drobné české skloňování pro rezervační průvodce. */

export function nightsLabel(n: number): string {
  if (n === 1) return "1 noc";
  if (n >= 2 && n <= 4) return `${n} noci`;
  return `${n} nocí`;
}

export function guestsLabel(n: number): string {
  if (n === 1) return "1 host";
  if (n >= 2 && n <= 4) return `${n} hosté`;
  return `${n} hostů`;
}

export function daysLabel(n: number): string {
  if (n === 1) return "1 den";
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
}
