import assert from 'node:assert/strict';
import test from 'node:test';
import { PLANTS, ZOMBIES } from '../app/game/catalog.ts';
import { canProjectileHit, canShootAtZombie, getProjectileTarget, getShotTime } from '../app/game/combat.ts';

const bubble = PLANTS['bubble-shooter'];
const scout = PLANTS['sprout-scout'];
const plant = { row: 2, col: 1 };
const zombie = { uid: 1, type: 'pothead-shambler', row: 2, x: 5, health: 250, maxHealth: 250,
  biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1 };

test('Bubble Shooter costs 100, has 100 HP and pea damage, and fires one bubble at triple the Scout rate', () => {
  assert.equal(bubble.cost, 100);
  assert.equal(bubble.health, 100);
  assert.equal(bubble.projectileDamage, scout.projectileDamage);
  assert.equal(bubble.projectileKind, 'bubble');
  assert.equal(bubble.projectilesPerVolley, 1);
  assert.equal(bubble.fireRateMs, scout.fireRateMs / 3);
  assert.ok(bubble.canHitAirborne);
  assert.ok(bubble.airborneImage);
});

test('Bubble Shooter targets only live, visible enemies ahead in its lane and prioritizes flying targets', () => {
  const ground = { ...zombie, x: 3 };
  const air = { ...zombie, uid: 2, x: 7, airborne: true };
  assert.equal(getProjectileTarget(plant, bubble, [ground, air], 9).uid, 2);
  assert.equal(getProjectileTarget(plant, bubble, [ground, { ...air, health: 0 }], 9).uid, 1);
  for (const invalid of [{ ...air, x: 9.25 }, { ...air, x: 1 }, { ...air, row: 3 }, { ...air, health: 0 }]) {
    assert.equal(getProjectileTarget(plant, bubble, [invalid], 9), undefined);
  }
  assert.equal(canShootAtZombie(plant, bubble, { ...air, x: 8.5 }, 9), true);
});

test('ground shooters and fire ignore airborne enemies, while bubble shots respect their chosen flight layer', () => {
  const air = { ...zombie, airborne: true };
  for (const id of ['sprout-scout', 'stone-shooter', 'watermelon-plant', 'mooshoom', 'fireshroom']) {
    assert.equal(canShootAtZombie(plant, PLANTS[id], air, 9), false);
  }
  const shot = { uid: 2, row: 2, x: 5, kind: 'bubble', damage: 25, speed: 1.85 };
  assert.equal(canProjectileHit(shot, zombie), true);
  assert.equal(canProjectileHit(shot, air), false);
  assert.equal(canProjectileHit({ ...shot, airborne: true }, air), true);
  assert.equal(canProjectileHit({ ...shot, airborne: true }, zombie), false);
  assert.equal(canProjectileHit({ ...shot, airborne: true }, { ...air, row: 3 }), false);
  assert.equal(canProjectileHit({ ...shot, airborne: true }, { ...air, x: 7 }), false);
});

test('the fixed 50ms game clock gives exactly three bubble volleys per Scout volley without fractional drift', () => {
  const countShots = (definition, preserveCadence) => {
    let last = 0;
    const times = [];
    for (let elapsed = 50; elapsed <= 7500; elapsed += 50) {
      const next = getShotTime(last, definition.fireRateMs, elapsed, preserveCadence);
      if (next !== null) { last = next; times.push(elapsed); }
    }
    return times;
  };
  const peas = countShots(scout, false);
  const bubbles = countShots(bubble, true);
  assert.equal(peas.length, 6);
  assert.equal(bubbles.length, 18);
  assert.ok(bubbles.every((time, index) => index === 0 || [400, 450].includes(time - bubbles[index - 1])));
});

test('idle time does not cause a catch-up burst and existing enemy waves stay ground based', () => {
  const first = getShotTime(0, bubble.fireRateMs, 50000, true);
  assert.equal(first, 50000);
  assert.equal(getShotTime(first, bubble.fireRateMs, 50050, true), null);
  assert.equal(getShotTime(first, bubble.fireRateMs, 50450, true), first + bubble.fireRateMs);
  assert.ok(Object.values(ZOMBIES).every((definition) => !definition.airborne));
});
