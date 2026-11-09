import type { MissileEntity, PlantEntity, RollingBallEntity, ZombieDefinition, ZombieEntity, ZombieId } from './types';

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

// Call after ALL damage/devours and before resolving deaths. A lethal hit can
// skip the threshold, but must never skip the boss's one-time last attack.
export function releaseLaneBalls(zombies: readonly ZombieEntity[], definitions: Record<ZombieId, ZombieDefinition>, elapsed: number, columns: number) {
  const balls: Omit<RollingBallEntity, 'uid'>[] = [];
  const updated = zombies.map((zombie) => {
    const ability = definitions[zombie.type].laneBall;
    if (!ability || zombie.ballReleased || zombie.health > zombie.maxHealth * ability.releaseHealthRatio) return zombie;
    // Enter from the right edge so the whole lane is swept, even when the boss
    // dies near the house or the player has planted behind it.
    balls.push({ row: zombie.row, x: columns + 0.5, speed: ability.speed, releasedAt: elapsed, image: ability.ballImage });
    return { ...zombie, ballReleased: true };
  });
  return { zombies: updated, balls };
}

export function advanceRollingBalls(balls: readonly RollingBallEntity[], plants: readonly PlantEntity[], tickMs: number) {
  const moved = balls.map((ball) => ({ ...ball, x: ball.x - ball.speed * tickMs / 1000 }));
  // Swept collision tests the entire path, so fast movement cannot skip a tile.
  const survivors = plants.filter((plant) => !moved.some((ball, index) => ball.row === plant.row
    && plant.col + 0.5 >= ball.x - 0.4 && plant.col + 0.5 <= balls[index].x + 0.4));
  return { balls: moved.filter((ball) => ball.x >= -0.5), plants: survivors };
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
