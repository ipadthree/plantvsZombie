import assert from 'node:assert/strict';
import test from 'node:test';
import { ZOMBIES } from '../app/game/catalog.ts';
import { advanceRollingBalls, releaseLaneBalls, resolveZombieDefeats } from '../app/game/enemies.ts';

const definition = ZOMBIES['t-rex-zombie'];
const boss = { uid: 1, type: definition.id, row: 2, x: 4, health: 2500, maxHealth: 2500,
  biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1 };
const makePlant = (row, col) => ({ uid: row * 9 + col, type: 'watermelon-plant', row, col,
  health: 250, lastShotAt: 0, pulseUntil: 0, digestUntil: 0 });

test('T rex has 10x normal health, 3x contact damage, and 2x movement speed', () => {
  const normal = ZOMBIES['pothead-shambler'];
  assert.equal(definition.health, normal.health * 10);
  assert.equal(definition.damagePerSecond, normal.damagePerSecond * 3);
  assert.equal(definition.speed, normal.speed * 2);
});

test('the metal ball releases once at 25% HP, including lethal shots, fire, or devour', () => {
  assert.equal(releaseLaneBalls([{ ...boss, health: 625.001 }], ZOMBIES, 1000, 9).balls.length, 0);
  for (const health of [625, 1, 0, -100]) {
    const released = releaseLaneBalls([{ ...boss, health }], ZOMBIES, 1000, 9);
    assert.equal(released.balls.length, 1);
    assert.equal(released.balls[0].row, boss.row);
    assert.equal(released.balls[0].releasedAt, 1000);
    assert.equal(released.zombies[0].ballReleased, true);
    assert.equal(releaseLaneBalls(released.zombies, ZOMBIES, 1050, 9).balls.length, 0);
  }
  assert.equal(boss.ballReleased, undefined);
  for (const type of ['pothead-shambler', 'log-zombie', 'horse-missile-zombie', 'zombie-horse']) {
    assert.equal(releaseLaneBalls([{ ...boss, type, health: 0 }], ZOMBIES, 1000, 9).balls.length, 0);
  }
});

test('the ball sweeps all nine plants in its lane, including behind the boss, leaving other lanes intact', () => {
  const released = releaseLaneBalls([{ ...boss, x: 0.2, health: 625 }], ZOMBIES, 1000, 9);
  let balls = released.balls.map((ball, uid) => ({ ...ball, uid }));
  const originalPlants = Array.from({ length: 5 }, (_, row) => Array.from({ length: 9 }, (__, col) => makePlant(row, col))).flat();
  let plants = originalPlants;
  let ticks = 0;
  while (balls.length) {
    const update = advanceRollingBalls(balls, plants, 50);
    balls = update.balls;
    plants = update.plants;
    assert.ok(++ticks <= 30, 'the ball should cross the lawn in about 1.25 seconds');
  }
  assert.equal(plants.length, 36);
  assert.ok(plants.every((plant) => plant.row !== boss.row));
  assert.deepEqual(plants, originalPlants.filter((plant) => plant.row !== boss.row));
  assert.equal(originalPlants.length, 45);
  assert.equal(originalPlants[18].health, 250);
});

test('fast swept collision never skips plants, and balls survive the boss death resolver', () => {
  const released = releaseLaneBalls([{ ...boss, health: -500 }], ZOMBIES, 1000, 9);
  const outcome = resolveZombieDefeats(released.zombies, ZOMBIES);
  assert.equal(outcome.zombies.length, 0);
  assert.equal(outcome.kills, 1);
  assert.equal(released.balls.length, 1);
  const ball = { ...released.balls[0], uid: 1 };
  const plants = Array.from({ length: 9 }, (_, col) => makePlant(2, col));
  const update = advanceRollingBalls([ball], plants, 2000);
  assert.equal(update.plants.length, 0);
  assert.equal(update.balls.length, 0);
});

test('four bosses can each release one independent lane ball without touching the fifth lane', () => {
  const released = releaseLaneBalls(Array.from({ length: 4 }, (_, row) => ({ ...boss, uid: row, row, health: 0 })), ZOMBIES, 1000, 9);
  assert.equal(released.balls.length, 4);
  const balls = released.balls.map((ball, uid) => ({ ...ball, uid }));
  const plants = Array.from({ length: 5 }, (_, row) => makePlant(row, 4));
  assert.deepEqual(advanceRollingBalls(balls, plants, 2000).plants, [plants[4]]);
  assert.equal(resolveZombieDefeats(released.zombies, ZOMBIES).kills, 4);
});
