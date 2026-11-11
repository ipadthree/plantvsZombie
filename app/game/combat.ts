import type { FirePlantDefinition, PlantEntity, ProjectileEntity, ProjectilePlantDefinition, SlowEffect, ZombieDefinition, ZombieEntity } from './types';

export function getDevourDamage(zombie: Pick<ZombieEntity, 'health' | 'maxHealth'>, definition: Pick<ZombieDefinition, 'devourDamageRatio'>) {
  const remaining = Math.max(0, zombie.health);
  // Boss bites use maximum HP, so damage does not shrink with each bite.
  return definition.devourDamageRatio === undefined ? remaining
    : Math.min(remaining, zombie.maxHealth * definition.devourDamageRatio);
}

export function canShootAtZombie(
  plant: Pick<PlantEntity, 'row' | 'col'>,
  definition: Pick<ProjectilePlantDefinition, 'attackRange' | 'canHitAirborne'>,
  zombie: Pick<ZombieEntity, 'row' | 'x' | 'airborne'>,
  columns: number,
) {
  return zombie.row === plant.row
    && (!zombie.airborne || definition.canHitAirborne === true)
    && zombie.x > plant.col + 0.15
    && zombie.x <= columns - 0.5
    && (definition.attackRange === undefined || zombie.x - plant.col < definition.attackRange);
}

export function getProjectileTarget(plant: Pick<PlantEntity, 'row' | 'col'>, definition: ProjectilePlantDefinition, zombies: readonly ZombieEntity[], columns: number) {
  return zombies.filter((zombie) => zombie.health > 0 && canShootAtZombie(plant, definition, zombie, columns))
    .sort((a, b) => (definition.canHitAirborne ? Number(Boolean(b.airborne)) - Number(Boolean(a.airborne)) : 0) || a.x - b.x)[0];
}

export function getShotTime(lastShotAt: number, fireRateMs: number, elapsed: number, preserveCadence = false): number | null {
  if (elapsed - lastShotAt + 0.000001 < fireRateMs) return null;
  // Preserve fractional fire periods on the fixed 50 ms clock, while allowing
  // at most one volley per tick after an idle period rather than a catch-up burst.
  return preserveCadence && elapsed - lastShotAt < fireRateMs * 2 ? lastShotAt + fireRateMs : elapsed;
}

export function isProjectileInRange(shot: ProjectileEntity) {
  return shot.maxX === undefined || shot.x < shot.maxX;
}

export function canProjectileHit(shot: ProjectileEntity, zombie: Pick<ZombieEntity, 'row' | 'x' | 'airborne'>) {
  return isProjectileInRange(shot)
    && Boolean(shot.airborne) === Boolean(zombie.airborne)
    && zombie.row === shot.row
    && zombie.x >= shot.x - 0.25
    && zombie.x <= shot.x + 0.38
    && (shot.maxX === undefined || zombie.x < shot.maxX);
}

export function applySlow(zombie: ZombieEntity, effect: SlowEffect, elapsed: number): ZombieEntity {
  return {
    ...zombie,
    // Refresh the effect without multiplying movement penalties or adding time.
    slowUntil: Math.max(zombie.slowUntil, elapsed + effect.durationMs),
    slowMultiplier: zombie.slowUntil > elapsed
      ? Math.min(zombie.slowMultiplier, effect.movementMultiplier)
      : effect.movementMultiplier,
  };
}

export function getZombieSpeed(zombie: ZombieEntity, baseSpeed: number, elapsed: number) {
  return baseSpeed * (zombie.slowUntil > elapsed ? zombie.slowMultiplier : 1);
}

export function advanceZombie(zombie: ZombieEntity, blocked: boolean, baseSpeed: number, elapsed: number, tickMs: number): ZombieEntity {
  return {
    ...zombie,
    biting: blocked,
    x: blocked ? zombie.x : zombie.x - getZombieSpeed(zombie, baseSpeed, elapsed) * tickMs / 1000,
  };
}

export function hasZombieReachedHouse(zombies: readonly ZombieEntity[]) {
  return zombies.some((zombie) => zombie.health > 0 && zombie.x <= 0.08);
}

export function getFirePhase(plant: PlantEntity, definition: FirePlantDefinition, elapsed: number) {
  if (plant.fireStartedAt !== undefined && elapsed < plant.fireStartedAt + definition.fireDurationMs) return 'firing';
  if (elapsed < (plant.rechargeUntil ?? 0)) return 'recharging';
  return 'ready';
}

export function stepFirePlant(plant: PlantEntity, definition: FirePlantDefinition, zombies: readonly ZombieEntity[], elapsed: number, tickMs: number, columns: number) {
  const targets = zombies.filter((zombie) => zombie.health > 0 && canShootAtZombie(plant, definition, zombie, columns));
  let next = plant;
  if (getFirePhase(plant, definition, elapsed) === 'ready' && targets.length) {
    next = { ...plant, fireStartedAt: elapsed, rechargeUntil: elapsed + definition.fireDurationMs + definition.rechargeMs };
  }
  const activeMs = getFirePhase(next, definition, elapsed) === 'firing'
    ? Math.min(tickMs, next.fireStartedAt! + definition.fireDurationMs - elapsed) : 0;
  return { plant: next, hits: activeMs > 0 ? targets.map((zombie) => ({ uid: zombie.uid, damage: definition.burstDamage * activeMs / definition.fireDurationMs })) : [] };
}
