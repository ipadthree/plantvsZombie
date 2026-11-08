import assert from 'node:assert/strict';
import test from 'node:test';
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

test('all three modes spawn the exact regular and Log Zombie quotas in all three waves', () => {
  const expected = {
    easy: [[12, 0], [12, 5], [12, 7]],
    hard: [[24, 0], [24, 10], [24, 14]],
    crazy: [[48, 0], [48, 20], [48, 28]],
  };
  for (const [mode, waves] of Object.entries(expected)) {
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      const counts = { 'pothead-shambler': 0, 'log-zombie': 0 };
      for (const group of spawnWave(mode, wave)) counts[group.type] += group.count;
      const [regular, log] = waves[wave - 1];
      assert.deepEqual(counts, { 'pothead-shambler': regular, 'log-zombie': log });
      assert.deepEqual(getWaveCounts(mode, wave), { regular, log, total: regular + log });
      assert.equal(getSpawnGroup(mode, wave, regular + log), null);
    }
  }
});

test('difficulty scales only group size and preserves Easy timing, type, and health progression', () => {
  for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
    const easy = spawnWave('easy', wave);
    for (const mode of ['hard', 'crazy']) {
      const groups = spawnWave(mode, wave);
      assert.equal(groups.length, easy.length);
      groups.forEach((group, index) => {
        assert.deepEqual(group, { ...easy[index], count: DIFFICULTIES[mode].multiplier });
      });
    }
    easy.forEach((group, index) => {
      assert.equal(group.delay, index === 0 ? 1200 : Math.max(2600, 5100 - index * 150));
      assert.equal(group.healthBonus, Math.floor(index / 4) * 15 * (group.type === 'log-zombie' ? 2 : 1));
    });
  }
});

test('wave transitions and final victory use the selected mode totals', () => {
  for (const [mode, total] of Object.entries({ easy: 48, hard: 96, crazy: 192 })) {
    let cleared = 0;
    for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
      assert.equal(getKillsBeforeWave(mode, wave), cleared);
      cleared += getWaveCounts(mode, wave).total;
    }
    assert.equal(cleared, total);
    assert.equal(getTotalZombies(mode), total);
  }
});
