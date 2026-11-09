import assert from 'node:assert/strict';
import test from 'node:test';
import { ZOMBIES } from '../app/game/catalog.ts';
import { advanceZombie, hasZombieReachedHouse } from '../app/game/combat.ts';
import { applyMissileImpacts, getMissileTargetColumns, launchMissiles, resolveZombieDefeats } from '../app/game/enemies.ts';

const definition = ZOMBIES['horse-missile-zombie'];
const zombie = { uid: 1, type: definition.id, row: 2, x: 6, health: 600, maxHealth: 600,
  biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1 };
const plant = { uid: 1, type: 'sprout-scout', row: 2, col: 5, health: 100, lastShotAt: 0, pulseUntil: 0, digestUntil: 0 };

test('Horse Missile Zombie has 600 HP, 1.5x normal speed, and normal melee during reload', () => {
  assert.equal(definition.health, 600);
  assert.equal(definition.speed, ZOMBIES['pothead-shambler'].speed * 1.5);
  assert.equal(definition.damagePerSecond, ZOMBIES['pothead-shambler'].damagePerSecond);
  const recharging = launchMissiles(zombie, definition, 1000, 9).zombie;
  assert.equal(advanceZombie(recharging, false, definition.speed, 1050, 50).x, zombie.x - definition.speed * .05);
  const biting = advanceZombie(recharging, true, definition.speed, 1050, 50);
  assert.equal(biting.x, zombie.x);
  assert.equal(biting.biting, true);
});

test('one volley targets exactly the three blocks ahead in the same lane, with 50 damage each', () => {
  const launch = launchMissiles(zombie, definition, 1000, 9);
  assert.deepEqual(launch.missiles.map((missile) => missile.targetCol), [5, 4, 3]);
  for (const missile of launch.missiles) {
    assert.equal(missile.row, zombie.row);
    assert.equal(missile.damage, 50);
    assert.equal(missile.launchedAt, 1000);
    assert.equal(missile.impactAt, 1650);
  }
  assert.deepEqual(getMissileTargetColumns(4.49, 3, 9), [3, 2, 1]);
  assert.deepEqual(getMissileTargetColumns(8.5, 3, 9), [8, 7, 6]);
  assert.deepEqual(getMissileTargetColumns(1, 3, 9), [0]);
});

test('launchers wait exactly 15 seconds of game time, and cannot fire off-board or after death', () => {
  const launch = launchMissiles(zombie, definition, 1000, 9);
  assert.equal(launch.zombie.missileReadyAt, 16000);
  assert.equal(launchMissiles(launch.zombie, definition, 15999, 9), null);
  assert.equal(launchMissiles(launch.zombie, definition, 16000, 9).missiles.length, 3);
  for (const invalid of [{ ...zombie, x: 9.25 }, { ...zombie, x: 0 }, { ...zombie, health: 0 }]) {
    assert.equal(launchMissiles(invalid, definition, 1000, 9), null);
  }
  assert.equal(launchMissiles({ ...zombie, type: 'zombie-horse' }, ZOMBIES['zombie-horse'], 1000, 9), null);
});

test('missiles damage only their locked tiles on impact, once; simultaneous volleys stack', () => {
  const missiles = launchMissiles(zombie, definition, 1000, 9).missiles.map((missile, uid) => ({ ...missile, uid }));
  const plants = [plant, { ...plant, uid: 2, col: 4 }, { ...plant, uid: 3, col: 3 },
    { ...plant, uid: 4, col: 2 }, { ...plant, uid: 5, row: 1 }, { ...plant, uid: 6, col: 6 }];
  assert.deepEqual(applyMissileImpacts(plants, missiles, 1600, 50).map((p) => p.health), [100, 100, 100, 100, 100, 100]);
  const damaged = applyMissileImpacts(plants, missiles, 1650, 50);
  assert.deepEqual(damaged.map((p) => p.health), [50, 50, 50, 100, 100, 100]);
  assert.deepEqual(applyMissileImpacts(damaged, missiles, 1700, 50), damaged);
  assert.deepEqual(applyMissileImpacts(plants, [...missiles, ...missiles], 1650, 50).map((p) => p.uid), [4, 5, 6]);
  assert.equal(plants[0].health, 100);
});

test('all rider defeat paths leave a normal-stat horse; only defeating the horse completes the encounter', () => {
  for (const health of [0, -25, -600]) {
    const result = resolveZombieDefeats([{ ...zombie, health, missileReadyAt: 15000 }], ZOMBIES);
    assert.equal(result.kills, 0);
    assert.equal(result.reward, 0);
    assert.equal(result.zombies.length, 1);
    const horse = result.zombies[0];
    assert.equal(horse.type, 'zombie-horse');
    assert.equal(horse.row, zombie.row);
    assert.equal(horse.x, zombie.x);
    assert.equal(horse.health, ZOMBIES['pothead-shambler'].health);
    assert.equal(horse.maxHealth, horse.health);
    assert.equal(horse.missileReadyAt, undefined);
    for (const key of ['speed', 'damagePerSecond', 'reward']) assert.equal(ZOMBIES[horse.type][key], ZOMBIES['pothead-shambler'][key]);
    const final = resolveZombieDefeats([{ ...horse, health: 0 }], ZOMBIES);
    assert.deepEqual(final, { zombies: [], kills: 1, reward: 20 });
  }
  assert.equal(hasZombieReachedHouse([{ ...zombie, type: 'zombie-horse', x: 0.08 }]), true);
});
