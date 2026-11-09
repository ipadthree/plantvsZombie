import type { MissileEntity, PlantEntity, ZombieDefinition, ZombieEntity, ZombieId } from './types';

export const MISSILE_IMPACT_MS = 400;

// x is measured from tile centers; lock targets at launch so walking/reloading
// cannot drag the blast zones or hit a plant in another lane.
export function getMissileTargetColumns(x: number, count: number, columns: number) {
  const occupiedCol = Math.floor(x + 0.5);
  return Array.from({ length: count }, (_, index) => occupiedCol - index - 1)
    .filter((col) => col >= 0 && col < columns);
}

export function launchMissiles(zombie: ZombieEntity, definition: ZombieDefinition, elapsed: number, columns: number) {
  const weapon = definition.missiles;
  if (!weapon || zombie.health <= 0 || zombie.x > columns - 0.5 || zombie.x <= 0.08
    || elapsed < (zombie.missileReadyAt ?? 0)) return null;
  const targets = getMissileTargetColumns(zombie.x, weapon.count, columns);
  if (!targets.length) return null;
  return {
    zombie: { ...zombie, missileReadyAt: elapsed + weapon.rechargeMs },
    missiles: targets.map((targetCol) => ({
      row: zombie.row, fromX: zombie.x, targetCol, damage: weapon.damage,
      launchedAt: elapsed, impactAt: elapsed + weapon.flightMs,
    })),
  };
}

export function applyMissileImpacts(plants: readonly PlantEntity[], missiles: readonly MissileEntity[], elapsed: number, tickMs: number) {
  // Each missile applies damage on one tick only; the explosion may stay visible.
  const impacts = missiles.filter((missile) => missile.impactAt <= elapsed && missile.impactAt > elapsed - tickMs);
  return plants.map((plant) => ({ ...plant, health: plant.health - impacts
    .filter((missile) => missile.row === plant.row && missile.targetCol === plant.col)
    .reduce((damage, missile) => damage + missile.damage, 0) }))
    .filter((plant) => plant.health > 0);
}

// Rider + horse are one wave encounter. All defeat paths (shots, fire, devour)
// pass through here, and only the horse's defeat completes that encounter.
export function resolveZombieDefeats(zombies: readonly ZombieEntity[], definitions: Record<ZombieId, ZombieDefinition>) {
  let kills = 0;
  let reward = 0;
  const survivors = zombies.flatMap((zombie): ZombieEntity[] => {
    if (zombie.health > 0) return [zombie];
    if (zombie.type === 'horse-missile-zombie') {
      const horse = definitions['zombie-horse'];
      return [{ ...zombie, type: horse.id, health: horse.health, maxHealth: horse.health,
        biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1, missileReadyAt: undefined }];
    }
    kills += 1;
    reward += definitions[zombie.type].reward;
    return [];
  });
  return { zombies: survivors, kills, reward };
}
