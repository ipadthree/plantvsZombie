import assert from 'node:assert/strict';
import test from 'node:test';
import { ZOMBIES } from '../app/game/catalog.ts';
import { applyTntImpacts, getBossImage, landImps, stepBossAbilities } from '../app/game/boss.ts';
import { hasZombieReachedHouse } from '../app/game/combat.ts';
import { resolveZombieDefeats } from '../app/game/enemies.ts';

const definition = ZOMBIES['boss-zombie'];
const boss = { uid: 1, type: definition.id, row: 2, x: 6, health: 2000, maxHealth: 2000,
  biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1 };
const plant = { uid: 1, type: 'watermelon-plant', row: 2, col: 5, health: 250,
  lastShotAt: 0, pulseUntil: 0, digestUntil: 0 };

test('Boss and Imp stats match the requested health, speed, and normal melee', () => {
  const normal = ZOMBIES['pothead-shambler'];
  assert.equal(definition.health, 2000);
  assert.equal(definition.speed, normal.speed * .9);
  assert.equal(definition.damagePerSecond, normal.damagePerSecond);
  for (const key of ['health', 'speed', 'damagePerSecond']) assert.equal(ZOMBIES['imp-zombie'][key], normal[key]);
});

test('TNT waits for a plant in the two tiles ahead, locks both tiles, and recharges for 20 seconds', () => {
  const first = stepBossAbilities(boss, definition, [plant], 1000, 9, 5);
  assert.equal(first.tnt.length, 1);
  assert.deepEqual(first.tnt[0].targetCols, [5, 4]);
  assert.equal(first.tnt[0].impactAt, 1900);
  assert.equal(first.zombie.tntReadyAt, 21000);
  assert.equal(stepBossAbilities(first.zombie, definition, [plant], 20999, 9, 5).tnt.length, 0);
  assert.equal(stepBossAbilities(first.zombie, definition, [plant], 21000, 9, 5).tnt.length, 1);
  for (const plants of [[], [{ ...plant, row: 1 }], [{ ...plant, col: 3 }], [{ ...plant, col: 6 }]]) {
    const result = stepBossAbilities(boss, definition, plants, 1000, 9, 5);
    assert.equal(result.tnt.length, 0);
    assert.equal(result.zombie.tntReadyAt, undefined);
  }
});

test('TNT destroys both locked tiles regardless of health, once at impact, without adjacent-lane damage', () => {
  const bomb = { ...stepBossAbilities(boss, definition, [plant], 1000, 9, 5).tnt[0], uid: 10 };
  const plants = [plant, { ...plant, uid: 2, col: 4, health: 99999 }, { ...plant, uid: 3, col: 3 }, { ...plant, uid: 4, row: 3 }];
  assert.equal(applyTntImpacts(plants, [bomb], 1850, 50).length, 4);
  const after = applyTntImpacts(plants, [bomb], 1900, 50);
  assert.deepEqual(after.map((p) => p.uid), [3, 4]);
  assert.equal(applyTntImpacts([plant], [bomb], 1950, 50).length, 1, 'replanting after the blast is allowed');
  assert.equal(plants[1].health, 99999);
});

test('Imp volleys contain exactly three independent lanes one tile ahead, with a separate 45-second reload', () => {
  const first = stepBossAbilities(boss, definition, [plant], 1000, 9, 5);
  assert.deepEqual(first.flights.map((flight) => flight.row), [1, 2, 3]);
  assert.ok(first.flights.every((flight) => flight.x === 5 && flight.landAt === 1900));
  assert.equal(first.zombie.impReadyAt, 46000);
  const secondTnt = stepBossAbilities(first.zombie, definition, [plant], 21000, 9, 5);
  assert.equal(secondTnt.tnt.length, 1);
  assert.equal(secondTnt.flights.length, 0);
  assert.equal(stepBossAbilities(first.zombie, definition, [], 45999, 9, 5).flights.length, 0);
  assert.equal(stepBossAbilities(first.zombie, definition, [], 46000, 9, 5).flights.length, 3);
  for (const row of [1, 3]) assert.deepEqual(stepBossAbilities({ ...boss, row }, definition, [], 0, 9, 5).flights.map((f) => f.row), [row - 1, row, row + 1]);
});

test('no boss ability fires offboard or after death; near-house Imps land safely on the first tile', () => {
  for (const invalid of [{ ...boss, x: 9.25 }, { ...boss, health: 0 }, { ...boss, x: 0 }]) {
    const result = stepBossAbilities(invalid, definition, [plant], 0, 9, 5);
    assert.equal(result.tnt.length, 0); assert.equal(result.flights.length, 0);
  }
  const nearHouse = stepBossAbilities({ ...boss, x: .2 }, definition, [], 0, 9, 5);
  assert.ok(nearHouse.flights.every((flight) => flight.x === .5));
});

test('launched Imps and TNT survive the boss, land once with normal stats, and count as real enemies', () => {
  const first = stepBossAbilities(boss, definition, [plant], 1000, 9, 5);
  const flights = first.flights.map((flight, index) => ({ ...flight, uid: 100 + index }));
  assert.equal(resolveZombieDefeats([{ ...first.zombie, health: 0 }], ZOMBIES).kills, 1);
  assert.equal(landImps(flights, ZOMBIES['imp-zombie'], 1899).zombies.length, 0);
  const landed = landImps(flights, ZOMBIES['imp-zombie'], 1900);
  assert.equal(landed.zombies.length, 3);
  assert.equal(landed.flights.length, 0);
  assert.equal(landImps(landed.flights, ZOMBIES['imp-zombie'], 1950).zombies.length, 0);
  assert.ok(landed.zombies.every((zombie) => zombie.health === 250 && zombie.maxHealth === 250 && zombie.type === 'imp-zombie'));
  assert.equal(resolveZombieDefeats(landed.zombies.map((zombie) => ({ ...zombie, health: 0 })), ZOMBIES).kills, 3);
  assert.equal(hasZombieReachedHouse([{ ...landed.zombies[0], x: .08 }]), true);
  assert.equal(applyTntImpacts([plant], first.tnt, 1900, 50).length, 0);
});

test('artwork reflects both independent reloads and becomes ready exactly at game-clock expiry', () => {
  const loadout = definition.bossLoadout;
  assert.equal(getBossImage(boss, definition, 0), definition.image);
  assert.equal(getBossImage({ ...boss, tntReadyAt: 20000 }, definition, 1000), loadout.tntEmptyImage);
  assert.equal(getBossImage({ ...boss, impReadyAt: 45000 }, definition, 1000), loadout.impsEmptyImage);
  assert.equal(getBossImage({ ...boss, tntReadyAt: 20000, impReadyAt: 45000 }, definition, 1000), loadout.emptyImage);
  assert.equal(getBossImage({ ...boss, tntReadyAt: 20000, impReadyAt: 45000 }, definition, 20000), loadout.impsEmptyImage);
  assert.equal(getBossImage({ ...boss, tntReadyAt: 20000, impReadyAt: 45000 }, definition, 45000), definition.image);
});
