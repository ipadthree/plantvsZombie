import assert from 'node:assert/strict';
import test from 'node:test';
import { ZOMBIES } from '../app/game/catalog.ts';
import { DIFFICULTIES, TOTAL_WAVES, getKillsBeforeWave, getSpawnDelayMs, getSpawnGroup, getTotalZombies, getWaveCounts } from '../app/game/difficulty.ts';

function spawnWave(mode, wave) {
  const groups = [];
  let spawned = 0;
  for (let group; (group = getSpawnGroup(mode, wave, spawned));) {
    groups.push({ ...group, delay: getSpawnDelayMs(mode, spawned) });
    spawned += group.count;
  }
  return groups;
}

test('all modes preserve regular/log quotas and add exact Horse Missile Zombie quotas', () => {
  const expected = {
    easy: [[12, 0, 0], [12, 5, 1], [12, 7, 2]],
    hard: [[24, 0, 0], [24, 10, 2], [24, 14, 4]],
    crazy: [[48, 0, 0], [48, 20, 4], [48, 28, 8]],
  };
  for (const [mode, waves] of Object.entries(expected)) {
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      const counts = { 'pothead-shambler': 0, 'log-zombie': 0, 'horse-missile-zombie': 0, 't-rex-zombie': 0 };
      for (const group of spawnWave(mode, wave)) counts[group.type] += group.count;
      const [regular, log, horseMissile] = waves[wave - 1];
      const tRex = mode === 'easy' ? 0 : (wave - 1) * (mode === 'hard' ? 1 : 2);
      assert.deepEqual(counts, { 'pothead-shambler': regular, 'log-zombie': log, 'horse-missile-zombie': horseMissile, 't-rex-zombie': tRex });
      assert.deepEqual(getWaveCounts(mode, wave), { regular, log, horseMissile, tRex, total: regular + log + horseMissile + tRex });
      assert.equal(getSpawnGroup(mode, wave, regular + log + horseMissile + tRex), null);
    }
  }
});

test('difficulty scales only group size and preserves Easy timing, type, and health progression', () => {
  for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
    const easy = spawnWave('easy', wave);
    for (const mode of ['hard', 'crazy']) {
      const groups = spawnWave(mode, wave).filter((group) => group.type !== 't-rex-zombie');
      assert.equal(groups.length, easy.length);
      groups.forEach((group, index) => {
        assert.deepEqual(group, { ...easy[index], count: DIFFICULTIES[mode].multiplier });
      });
    }
    let originalIndex = 0;
    easy.forEach((group, index) => {
      assert.equal(group.delay, index === 0 ? 1200 : Math.max(2600, 5100 - index * 150));
      assert.equal(group.healthBonus, group.type === 'horse-missile-zombie' ? 0 : Math.floor(originalIndex / 4) * 30 * (group.type === 'log-zombie' ? 2 : 1));
      if (group.type !== 'horse-missile-zombie') originalIndex++;
    });
  }
});

test('existing zombies retain doubled health; new Horse Missile Zombies always have 600 HP', () => {
  const previousBaseHealth = { 'pothead-shambler': 125, 'log-zombie': 250 };
  for (const mode of Object.keys(DIFFICULTIES)) {
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      let originalIndex = 0;
      spawnWave(mode, wave).forEach((group) => {
        const maxHealth = ZOMBIES[group.type].health + group.healthBonus;
        if (group.type === 't-rex-zombie') { assert.equal(maxHealth, 2500); return; }
        if (group.type === 'horse-missile-zombie') { assert.equal(maxHealth, 600); return; }
        const previousBonus = Math.floor(originalIndex++ / 4) * 15 * (group.type === 'log-zombie' ? 2 : 1);
        assert.equal(maxHealth, 2 * (previousBaseHealth[group.type] + previousBonus));
      });
    }
  }
});

test('wave transitions and final victory use the selected mode totals', () => {
  for (const [mode, total] of Object.entries({ easy: 51, hard: 105, crazy: 210 })) {
    let cleared = 0;
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      assert.equal(getKillsBeforeWave(mode, wave), cleared);
      cleared += getWaveCounts(mode, wave).total;
    }
    assert.equal(cleared, total);
    assert.equal(getTotalZombies(mode), total);
  }
});

test('T rex bosses are exactly the final group, with no Easy or wave-1 bosses', () => {
  for (const mode of Object.keys(DIFFICULTIES)) {
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      const groups = spawnWave(mode, wave);
      const bosses = groups.filter((group) => group.type === 't-rex-zombie');
      const expected = mode === 'easy' || wave === 1 ? 0 : (wave - 1) * (mode === 'hard' ? 1 : 2);
      assert.equal(bosses.reduce((total, group) => total + group.count, 0), expected);
      if (expected) {
        assert.equal(bosses.length, 1);
        assert.equal(groups.at(-1).type, 't-rex-zombie');
        assert.equal(groups.at(-1).healthBonus, 0);
        assert.ok(groups.slice(0, -1).every((group) => group.type !== 't-rex-zombie'));
      }
    }
  }
});
