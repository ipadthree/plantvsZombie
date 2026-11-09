import type { ImpFlightEntity, PlantEntity, TntEntity, ZombieDefinition, ZombieEntity } from './types';

export const TNT_BLAST_MS = 500;

export function stepBossAbilities(zombie: ZombieEntity, definition: ZombieDefinition, plants: readonly PlantEntity[], elapsed: number, columns: number, rows: number) {
  const loadout = definition.bossLoadout;
  const tnt: Omit<TntEntity, 'uid'>[] = [];
  const flights: Omit<ImpFlightEntity, 'uid'>[] = [];
  if (!loadout || zombie.health <= 0 || zombie.x > columns - 0.5 || zombie.x <= 0.08) return { zombie, tnt, flights };
  let next = zombie;
  const occupiedCol = Math.floor(zombie.x + 0.5);
  const targetCols = [occupiedCol - 1, occupiedCol - 2].filter((col) => col >= 0 && col < columns);
  if (elapsed >= (zombie.tntReadyAt ?? 0) && plants.some((plant) => plant.row === zombie.row && targetCols.includes(plant.col))) {
    tnt.push({ row: zombie.row, fromX: zombie.x, targetCols, launchedAt: elapsed, impactAt: elapsed + loadout.flightMs });
    next = { ...next, tntReadyAt: elapsed + loadout.tntRechargeMs, bossPulseUntil: elapsed + 450 };
  }
  if (elapsed >= (zombie.impReadyAt ?? 0) && zombie.row > 0 && zombie.row < rows - 1) {
    for (const row of [zombie.row - 1, zombie.row, zombie.row + 1]) {
      flights.push({ fromRow: zombie.row, row, fromX: zombie.x, x: Math.max(0.5, zombie.x - 1),
        launchedAt: elapsed, landAt: elapsed + loadout.flightMs });
    }
    next = { ...next, impReadyAt: elapsed + loadout.impRechargeMs, bossPulseUntil: elapsed + 450 };
  }
  return { zombie: next, tnt, flights };
}

export function applyTntImpacts(plants: readonly PlantEntity[], tnt: readonly TntEntity[], elapsed: number, tickMs: number) {
  const impacts = tnt.filter((bomb) => bomb.impactAt <= elapsed && bomb.impactAt > elapsed - tickMs);
  return plants.filter((plant) => !impacts.some((bomb) => bomb.row === plant.row && bomb.targetCols.includes(plant.col)));
}

export function landImps(flights: readonly ImpFlightEntity[], definition: ZombieDefinition, elapsed: number) {
  const landed: ZombieEntity[] = flights.filter((flight) => flight.landAt <= elapsed).map((flight) => ({
    uid: flight.uid, type: definition.id, row: flight.row, x: flight.x,
    health: definition.health, maxHealth: definition.health, biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1,
  }));
  return { zombies: landed, flights: flights.filter((flight) => flight.landAt > elapsed) };
}

export function getBossImage(zombie: ZombieEntity, definition: ZombieDefinition, elapsed: number) {
  const loadout = definition.bossLoadout;
  if (!loadout) return definition.image;
  const tntEmpty = elapsed < (zombie.tntReadyAt ?? 0);
  const impsEmpty = elapsed < (zombie.impReadyAt ?? 0);
  return tntEmpty && impsEmpty ? loadout.emptyImage : tntEmpty ? loadout.tntEmptyImage
    : impsEmpty ? loadout.impsEmptyImage : definition.image;
}
