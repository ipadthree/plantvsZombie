import type { ZombieId } from './types';

export const DIFFICULTIES = {
  easy: { label: 'Easy', multiplier: 1, icon: '/assets/mode-easy.webp' },
  hard: { label: 'Hard', multiplier: 2, icon: '/assets/mode-hard.webp' },
  crazy: { label: 'Crazy', multiplier: 4, icon: '/assets/mode-crazy.webp' },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;

export const DIFFICULTY_OPTIONS = Object.keys(DIFFICULTIES) as Difficulty[];

const BASE_WAVES = [
  { regular: 12, log: 0, horseMissile: 0 },
  { regular: 12, log: 5, horseMissile: 1 },
  { regular: 12, log: 7, horseMissile: 2 },
] as const;

export const TOTAL_WAVES = BASE_WAVES.length;

export function getWaveCounts(difficulty: Difficulty, wave: number) {
  const base = BASE_WAVES[wave - 1];
  if (!base) throw new RangeError(`Unknown wave: ${wave}`);
  const multiplier = DIFFICULTIES[difficulty].multiplier;
  const regular = base.regular * multiplier;
  const log = base.log * multiplier;
  const horseMissile = base.horseMissile * multiplier;
  return { regular, log, horseMissile, total: regular + log + horseMissile };
}

export function getTotalZombies(difficulty: Difficulty) {
  return BASE_WAVES.reduce((total, _, index) => total + getWaveCounts(difficulty, index + 1).total, 0);
}

export function getKillsBeforeWave(difficulty: Difficulty, wave: number) {
  return BASE_WAVES.slice(0, wave - 1).reduce((total, _, index) => total + getWaveCounts(difficulty, index + 1).total, 0);
}

export function getSpawnDelayMs(difficulty: Difficulty, spawned: number) {
  const baseIndex = Math.floor(spawned / DIFFICULTIES[difficulty].multiplier);
  return baseIndex === 0 ? 1200 : Math.max(2600, 5100 - baseIndex * 150);
}

// Each Easy encounter becomes a group in the other modes. This increases only
// enemy numbers while preserving the original encounter timing and health curve.
export function getSpawnGroup(difficulty: Difficulty, wave: number, spawned: number) {
  const counts = getWaveCounts(difficulty, wave);
  if (spawned >= counts.total) return null;

  const multiplier = DIFFICULTIES[difficulty].multiplier;
  const baseIndex = Math.floor(spawned / multiplier);
  const base = BASE_WAVES[wave - 1];
  const baseTotal = base.regular + base.log + base.horseMissile;
  const horseQuotaBefore = Math.floor(baseIndex * base.horseMissile / baseTotal);
  const horseQuotaAfter = Math.floor((baseIndex + 1) * base.horseMissile / baseTotal);
  // Spread the new encounters through each wave, preserving every regular/log slot.
  const originalIndex = baseIndex - horseQuotaBefore;
  const originalTotal = base.regular + base.log;
  const logQuotaBefore = Math.floor(originalIndex * base.log / originalTotal);
  const logQuotaAfter = Math.floor((originalIndex + 1) * base.log / originalTotal);
  const type: ZombieId = horseQuotaAfter > horseQuotaBefore ? 'horse-missile-zombie'
    : logQuotaAfter > logQuotaBefore ? 'log-zombie' : 'pothead-shambler';

  return {
    type,
    count: Math.min(multiplier, counts.total - spawned),
    healthBonus: type === 'horse-missile-zombie' ? 0 : Math.floor(originalIndex / 4) * 30 * (type === 'log-zombie' ? 2 : 1),
  };
}
