import assert from 'node:assert/strict';
import test from 'node:test';
import { PLANTS, ZOMBIES } from '../app/game/catalog.ts';
import { advanceZombie, applySlow, canProjectileHit, canShootAtZombie, getZombieSpeed, hasZombieReachedHouse, isProjectileInRange } from '../app/game/combat.ts';

const mooshoom = PLANTS.mooshoom;
const plant = { row: 2, col: 0 };
const zombie = {
  uid: 1, type: 'pothead-shambler', row: 2, x: 4,
  health: 125, maxHealth: 125, biting: false, hitUntil: 0,
  slowUntil: 0, slowMultiplier: 1,
};

test('Mooshoom has the requested cost, health, damage, and purple projectile', () => {
  assert.equal(mooshoom.cost, 0);
  assert.equal(mooshoom.health, 25);
  assert.equal(mooshoom.projectileDamage, PLANTS['sprout-scout'].projectileDamage / 4);
  assert.equal(mooshoom.projectileKind, 'purple-pea');
  assert.equal(mooshoom.projectilesPerVolley, 1);
});

test('Mooshoom targets only visible zombies in its lane strictly less than five tiles ahead', () => {
  assert.equal(canShootAtZombie(plant, mooshoom, { ...zombie, x: 4.999 }, 9), true);
  for (const target of [
    { ...zombie, x: 5 },
    { ...zombie, x: 5.001 },
    { ...zombie, x: 9.25 },
    { ...zombie, x: -1 },
    { ...zombie, row: 3 },
  ]) assert.equal(canShootAtZombie(plant, mooshoom, target, 9), false);

  assert.equal(canShootAtZombie({ row: 2, col: 4 }, mooshoom, { ...zombie, x: 9 }, 9), false);
  assert.equal(canShootAtZombie({ row: 2, col: 3 }, mooshoom, { ...zombie, x: 7.999 }, 9), true);
  assert.equal(canShootAtZombie({ row: 2, col: 3 }, mooshoom, { ...zombie, x: 8 }, 9), false);
});

test('purple peas expire at their maximum range and cannot hit beyond it', () => {
  const shot = { uid: 1, row: 2, x: 4.8, damage: 6.25, kind: 'purple-pea', speed: 1.85, maxX: 5 };
  assert.equal(isProjectileInRange(shot), true);
  assert.equal(canProjectileHit(shot, { row: 2, x: 4.99 }), true);
  assert.equal(canProjectileHit(shot, { row: 2, x: 5 }), false);
  assert.equal(canProjectileHit(shot, { row: 3, x: 4.9 }), false);
  assert.equal(isProjectileInRange({ ...shot, x: 5 }), false);
  assert.equal(canProjectileHit({ ...shot, x: 5 }, { row: 2, x: 4.99 }), false);
});

test('existing shooters retain full-lane targeting and unrestricted projectile travel', () => {
  for (const id of ['sprout-scout', 'stone-shooter', 'watermelon-plant']) {
    assert.equal(canShootAtZombie(plant, PLANTS[id], { ...zombie, x: 8.5 }, 9), true);
    assert.equal(canShootAtZombie(plant, PLANTS[id], { ...zombie, x: 8.501 }, 9), false);
  }
  const pea = { uid: 1, row: 2, x: 7.8, damage: 25, kind: 'pea', speed: 1.85 };
  assert.equal(isProjectileInRange(pea), true);
  assert.equal(canProjectileHit(pea, { row: 2, x: 8 }), true);
});

test('slow affects movement for three seconds and restores both zombie types at expiry', () => {
  for (const [id, definition] of Object.entries(ZOMBIES)) {
    const original = { ...zombie, type: id };
    const slowed = applySlow(original, mooshoom.slowEffect, 1000);
    assert.equal(getZombieSpeed(original, definition.speed, 1000), definition.speed);
    assert.equal(getZombieSpeed(slowed, definition.speed, 3999), definition.speed * 0.5);
    assert.equal(getZombieSpeed(slowed, definition.speed, 4000), definition.speed);
    assert.equal(slowed.health, original.health);
    assert.equal(slowed.biting, original.biting);
    assert.equal(original.slowUntil, 0);
  }
});

test('repeat hits refresh slow without stacking speed penalties or duration', () => {
  const first = applySlow(zombie, mooshoom.slowEffect, 0);
  const refreshed = applySlow(first, mooshoom.slowEffect, 2000);
  assert.equal(refreshed.slowMultiplier, 0.5);
  assert.equal(refreshed.slowUntil, 5000);
  assert.equal(getZombieSpeed(refreshed, 0.105, 4999), 0.0525);
  assert.equal(getZombieSpeed(refreshed, 0.105, 5000), 0.105);
  assert.equal(applySlow(refreshed, mooshoom.slowEffect, 6000).slowUntil, 9000);
});

test('the first living zombie at the house boundary triggers a breach in every lane and for both types', () => {
  for (const type of Object.keys(ZOMBIES)) {
    for (let row = 0; row < 5; row++) {
      assert.equal(hasZombieReachedHouse([{ ...zombie, type, row, x: 0.08 }]), true);
      assert.equal(hasZombieReachedHouse([{ ...zombie, type, row, x: -0.1 }]), true);
      assert.equal(hasZombieReachedHouse([{ ...zombie, type, row, x: 0.081 }]), false);
    }
  }
  assert.equal(hasZombieReachedHouse([]), false);
  assert.equal(hasZombieReachedHouse([{ ...zombie, x: 0, health: 0 }]), false);
  assert.equal(hasZombieReachedHouse([{ ...zombie, x: 9.25 }]), false);
});

test('a zombie resumes walking after its blocking plant is eaten and triggers game over without disappearing', () => {
  const eating = { ...zombie, x: 0.081, biting: true };
  const blocked = advanceZombie(eating, true, 0.105, 1000, 50);
  assert.equal(blocked.x, eating.x);
  assert.equal(hasZombieReachedHouse([blocked]), false);

  const intruder = advanceZombie(blocked, false, 0.105, 1050, 50);
  assert.equal(hasZombieReachedHouse([intruder]), true);
  assert.equal(intruder.biting, false);
  assert.equal(intruder.uid, eating.uid);
  assert.equal(intruder.health, eating.health);
  assert.equal(eating.x, 0.081);
});

test('a slowed zombie still triggers a breach on the tick it reaches the house', () => {
  let approaching = applySlow({ ...zombie, x: 0.084 }, mooshoom.slowEffect, 0);
  approaching = advanceZombie(approaching, false, 0.105, 50, 50);
  assert.equal(hasZombieReachedHouse([approaching]), false);
  approaching = advanceZombie(approaching, false, 0.105, 100, 50);
  assert.equal(hasZombieReachedHouse([approaching]), true);
});
