import assert from 'node:assert/strict';
import test from 'node:test';
import { PLANTS, ZOMBIES } from '../app/game/catalog.ts';
import { getDevourDamage } from '../app/game/combat.ts';
import { releaseLaneBalls, resolveZombieDefeats } from '../app/game/enemies.ts';

function makeZombie(type, health = ZOMBIES[type].health) {
  return { uid: 1, type, row: 2, x: 4, health, maxHealth: ZOMBIES[type].health,
    biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1 };
}

function bite(zombie) {
  return { ...zombie, health: zombie.health - getDevourDamage(zombie, ZOMBIES[zombie.type]) };
}

test('Boss Zombie loses 30% of maximum health per bite, requiring four full-health bites', () => {
  let zombie = makeZombie('boss-zombie');
  for (const expected of [1400, 800, 200, 0]) {
    zombie = bite(zombie);
    assert.equal(zombie.health, expected);
    const result = resolveZombieDefeats([zombie], ZOMBIES);
    assert.equal(result.kills, expected === 0 ? 1 : 0);
    assert.equal(result.reward, expected === 0 ? 20 : 0);
    if (expected) assert.equal(result.zombies[0].type, 'boss-zombie');
  }
});

test('T rex loses 50% of maximum health; the first full-health bite does not release its ball', () => {
  const first = bite(makeZombie('t-rex-zombie'));
  assert.equal(first.health, 1250);
  const alive = releaseLaneBalls([first], ZOMBIES, 0, 9);
  assert.equal(alive.balls.length, 0);
  assert.equal(resolveZombieDefeats(alive.zombies, ZOMBIES).kills, 0);
  const second = bite(first);
  assert.equal(second.health, 0);
  const defeated = releaseLaneBalls([second], ZOMBIES, 5000, 9);
  assert.equal(defeated.balls.length, 1);
  assert.equal(resolveZombieDefeats(defeated.zombies, ZOMBIES).kills, 1);
});

test('weakened bosses can die to one bite; T rex still releases at its normal low-health threshold', () => {
  assert.equal(bite(makeZombie('boss-zombie', 500)).health, 0);
  assert.equal(bite(makeZombie('t-rex-zombie', 1200)).health, 0);
  const weakened = bite(makeZombie('t-rex-zombie', 1500));
  assert.equal(weakened.health, 250);
  const release = releaseLaneBalls([weakened], ZOMBIES, 0, 9);
  assert.equal(release.balls.length, 1);
  assert.equal(releaseLaneBalls([bite(release.zombies[0])], ZOMBIES, 5000, 9).balls.length, 0);
});

test('ordinary zombies are still swallowed whole; swallowing the rider leaves its horse', () => {
  for (const type of ['pothead-shambler', 'log-zombie', 'horse-missile-zombie', 'zombie-horse', 'imp-zombie']) {
    const zombie = bite(makeZombie(type, 47));
    assert.equal(zombie.health, 0);
    const result = resolveZombieDefeats([zombie], ZOMBIES);
    if (type === 'horse-missile-zombie') {
      assert.equal(result.kills, 0);
      assert.equal(result.zombies[0].type, 'zombie-horse');
    } else {
      assert.equal(result.kills, 1);
      assert.equal(result.zombies.length, 0);
    }
  }
});

test('Stone Plant keeps five-second digestion and boss bites can combine with other damage', () => {
  assert.equal(PLANTS['stone-plant'].digestMs, 5000);
  const first = bite(makeZombie('boss-zombie'));
  const otherDamage = { ...first, health: first.health - 125 };
  assert.equal(getDevourDamage(otherDamage, ZOMBIES['boss-zombie']), 600);
  assert.equal(bite(otherDamage).health, 675);
  assert.equal(getDevourDamage({ health: 4000, maxHealth: 4000 }, ZOMBIES['boss-zombie']), 1200);
});
