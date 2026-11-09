'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PLANTS, ZOMBIES } from './catalog';
import { advanceZombie, applySlow, canProjectileHit, canShootAtZombie, getFirePhase, hasZombieReachedHouse, isProjectileInRange, stepFirePlant } from './combat';
import { DIFFICULTIES, DIFFICULTY_OPTIONS, TOTAL_WAVES, getKillsBeforeWave, getSpawnDelayMs, getSpawnGroup, getTotalZombies, getWaveCounts } from './difficulty';
import { advanceRollingBalls, applyMissileImpacts, launchMissiles, MISSILE_IMPACT_MS, releaseLaneBalls, resolveZombieDefeats } from './enemies';
import type { Difficulty } from './difficulty';
import type { MissileEntity, PlantEntity, PlantId, ProjectileEntity, RollingBallEntity, SlowEffect, SunEntity, ZombieEntity } from './types';

const ROWS = 5;
const COLS = 9;
const TICK_MS = 50;

type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export default function Game() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [energy, setEnergy] = useState(150);
  const [plants, setPlants] = useState<PlantEntity[]>([]);
  const [zombies, setZombies] = useState<ZombieEntity[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);
  const [missiles, setMissiles] = useState<MissileEntity[]>([]);
  const [rollingBalls, setRollingBalls] = useState<RollingBallEntity[]>([]);
  const [suns, setSuns] = useState<SunEntity[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantId | null>('sprout-scout');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [currentWave, setCurrentWave] = useState(1);
  const [kills, setKills] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState('Pick a plant, then choose a tile.');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const serial = useRef(1);
  const lastSpawnAt = useRef(0);
  const lastSunAt = useRef(0);
  const lastSimulatedAt = useRef(-1);
  const zombiesThisWave = getWaveCounts(difficulty, currentWave).total;
  const totalZombies = getTotalZombies(difficulty);
  const killsBeforeThisWave = getKillsBeforeWave(difficulty, currentWave);
  const waveKills = Math.max(0, kills - killsBeforeThisWave);

  useEffect(() => {
    const definition = PLANTS.fireshroom;
    if (definition.attackMode !== 'fire') return;
    [definition.firingImage, definition.rechargeImage, ...definition.fireFrames].forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
    ['/assets/horse-missile-zombie/ready.webp', '/assets/horse-missile-zombie/recharging.webp', '/assets/horse-missile-zombie/horse.webp', '/assets/horse-missile-zombie/missile.webp'].forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
    const boss = ZOMBIES['t-rex-zombie'];
    [boss.image, boss.laneBall!.releasedImage, boss.laneBall!.ballImage].forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, []);

  const restart = useCallback(() => {
    setEnergy(150); setPlants([]); setZombies([]); setProjectiles([]); setMissiles([]); setSuns([]);
    setRollingBalls([]);
    setStatus('playing'); setCurrentWave(1); setKills(0); setSpawned(0); setElapsed(0);
    setSelectedPlant('sprout-scout');
    setNotice('Pick a plant, then choose a tile.');
    lastSpawnAt.current = 0; lastSunAt.current = 0;
    lastSimulatedAt.current = -1;
  }, []);

  const changeDifficulty = (nextDifficulty: Difficulty) => {
    if (nextDifficulty === difficulty) return;
    setDifficulty(nextDifficulty);
    restart();
    setNotice(`${DIFFICULTIES[nextDifficulty].label} mode started. Pick a plant, then choose a tile.`);
  };

  const togglePause = useCallback(() => {
    setStatus((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current);
  }, []);

  const playMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !musicEnabled) return;
    audio.volume = 0.32;
    void audio.play().catch(() => {
      // Browsers may require a user gesture; the listeners below retry then.
    });
  }, [musicEnabled]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    setMusicEnabled((current) => {
      if (current) {
        audio?.pause();
      } else if (audio) {
        audio.volume = 0.32;
        void audio.play().catch(() => {});
      }
      return !current;
    });
  }, []);

  useEffect(() => {
    playMusic();
    const unlockMusic = () => playMusic();
    window.addEventListener('pointerdown', unlockMusic, { once: true });
    window.addEventListener('keydown', unlockMusic, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockMusic);
      window.removeEventListener('keydown', unlockMusic);
    };
  }, [playMusic]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '1') setSelectedPlant('sprout-scout');
      if (event.key === '2') setSelectedPlant('stone-shooter');
      if (event.key === '3') setSelectedPlant('stone-plant');
      if (event.key === '4') setSelectedPlant('watermelon-plant');
      if (event.key === '5') setSelectedPlant('mooshoom');
      if (event.key === '6') setSelectedPlant('fireshroom');
      if (event.key === 'Escape') setSelectedPlant(null);
      const isControl = event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea');
      if (event.key === ' ' && !isControl) { event.preventDefault(); togglePause(); }
      if (event.key.toLowerCase() === 'r' && (status === 'won' || status === 'lost')) restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restart, status, togglePause]);

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = window.setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== 'playing' || lastSimulatedAt.current === elapsed) return;
    lastSimulatedAt.current = elapsed;

    const moveZombie = (zombie: ZombieEntity, blockers = plants) => {
      const blocked = blockers.some((plant) => plant.row === zombie.row && Math.abs(zombie.x - (plant.col + 0.5)) < 0.52);
      return advanceZombie(zombie, blocked, ZOMBIES[zombie.type].speed, elapsed, TICK_MS);
    };
    const movedZombies = zombies.map((zombie) => moveZombie(zombie));
    // The first breach ends this tick before spawning, attacks, rewards, or wave
    // progression can erase the intruder or turn the defeat into a victory.
    if (hasZombieReachedHouse(movedZombies)) {
      setZombies(movedZombies);
      setStatus('lost');
      setNotice('zombie ate your brain — game over.');
      return;
    }

    let newcomers: ZombieEntity[] = [];
    if (spawned < zombiesThisWave && elapsed - lastSpawnAt.current >= getSpawnDelayMs(difficulty, spawned)) {
      const group = getSpawnGroup(difficulty, currentWave, spawned)!;
      const definition = ZOMBIES[group.type];
      const maxHealth = definition.health + group.healthBonus;
      const availableRows = Array.from({ length: ROWS }, (_, row) => row);
      newcomers = Array.from({ length: group.count }, () => {
        // Keep members of one group in different lanes so they remain readable.
        const [row] = availableRows.splice(Math.floor(Math.random() * availableRows.length), 1);
        return {
          uid: serial.current++, type: definition.id, row, x: 9.25,
          health: maxHealth, maxHealth, biting: false, hitUntil: 0, slowUntil: 0, slowMultiplier: 1,
        };
      });
      setSpawned((value) => value + group.count);
      lastSpawnAt.current = elapsed;
      setNotice(group.type === 't-rex-zombie' ? `BOSS: ${group.count} T rex Zombie${group.count > 1 ? 's' : ''} close wave ${currentWave}! Beware the metal ball.` : group.type === 'horse-missile-zombie' ? `Wave ${currentWave}: Horse Missile Zombie incoming! Watch the next three tiles.` : group.type === 'log-zombie' ? `Wave ${currentWave}: a Log Zombie entered the yard!` : currentWave === TOTAL_WAVES && spawned / DIFFICULTIES[difficulty].multiplier > 7 ? 'Final wave incoming!' : `Wave ${currentWave}: a shambler entered the yard.`);
    }

    if (elapsed - lastSunAt.current >= 5600) {
      setSuns((current) => [...current.slice(-3), {
        uid: serial.current++, x: 10 + Math.random() * 78, y: 8 + Math.random() * 70, value: 25,
      }]);
      lastSunAt.current = elapsed;
    }

    const activeMissiles = missiles.filter((missile) => elapsed < missile.impactAt + MISSILE_IMPACT_MS);
    const armedZombies = zombies.map((zombie) => {
      const launch = launchMissiles(zombie, ZOMBIES[zombie.type], elapsed, COLS);
      if (!launch) return zombie;
      activeMissiles.push(...launch.missiles.map((missile) => ({ ...missile, uid: serial.current++ })));
      return launch.zombie;
    });
    const rolling = advanceRollingBalls(rollingBalls, applyMissileImpacts(plants, activeMissiles, elapsed, TICK_MS), TICK_MS);
    const intactPlants = rolling.plants;
    const claimedZombies = new Set<number>();
    const devours = new Map<number, number>();
    intactPlants.forEach((plant) => {
      const definition = PLANTS[plant.type];
      if (definition.attackMode !== 'devour' || plant.digestUntil > elapsed) return;
      const target = armedZombies
        .filter((zombie) => !claimedZombies.has(zombie.uid)
          && zombie.health > 0 && zombie.x <= COLS - 0.5
          && zombie.row === plant.row
          && zombie.x >= plant.col + 0.15
          && Math.abs(zombie.x - (plant.col + 0.5)) <= definition.devourRange)
        .sort((a, b) => Math.abs(a.x - (plant.col + 0.5)) - Math.abs(b.x - (plant.col + 0.5)))[0];
      if (target) {
        claimedZombies.add(target.uid);
        devours.set(plant.uid, target.uid);
      }
    });
    if (claimedZombies.size) {
      setNotice('Stone Plant swallowed a shambler. Digesting for 5 seconds…');
    }

    const fireUpdates = new Map<number, PlantEntity>();
    const fireHits = new Map<number, number>();
    intactPlants.forEach((plant) => {
      const definition = PLANTS[plant.type];
      if (definition.attackMode !== 'fire') return;
      const attacker = armedZombies.find((zombie) => !claimedZombies.has(zombie.uid) && zombie.row === plant.row && Math.abs(zombie.x - (plant.col + 0.5)) < 0.52);
      if (attacker && plant.health <= ZOMBIES[attacker.type].damagePerSecond * TICK_MS / 1000) return;
      const update = stepFirePlant(plant, definition, armedZombies.filter((zombie) => !claimedZombies.has(zombie.uid)), elapsed, TICK_MS, COLS);
      fireUpdates.set(plant.uid, update.plant);
      update.hits.forEach((hit) => fireHits.set(hit.uid, (fireHits.get(hit.uid) ?? 0) + hit.damage));
    });

    const newShots: ProjectileEntity[] = [];
    const damaged = intactPlants.map((plant) => {
      const attacker = armedZombies.find((zombie) => !claimedZombies.has(zombie.uid) && zombie.row === plant.row && Math.abs(zombie.x - (plant.col + 0.5)) < 0.52);
      const nextPlant = attacker ? { ...plant, health: plant.health - ZOMBIES[attacker.type].damagePerSecond * TICK_MS / 1000 } : plant;
      if (devours.has(plant.uid)) {
        const definition = PLANTS[plant.type];
        if (definition.attackMode === 'devour') {
          return { ...nextPlant, pulseUntil: elapsed + 430, digestUntil: elapsed + definition.digestMs };
        }
      }
      const fireUpdate = fireUpdates.get(plant.uid);
      return fireUpdate ? { ...fireUpdate, health: nextPlant.health } : nextPlant;
    }).filter((plant) => plant.health > 0);

    damaged.forEach((plant) => {
      const definition = PLANTS[plant.type];
      if (definition.attackMode !== 'projectile') return;
      const hasTarget = armedZombies.some((zombie) => !claimedZombies.has(zombie.uid) && canShootAtZombie(plant, definition, zombie, COLS));
      if (hasTarget && elapsed - plant.lastShotAt >= definition.fireRateMs) {
        plant.lastShotAt = elapsed;
        plant.pulseUntil = elapsed + 180;
        const volley = Array.from({ length: definition.projectilesPerVolley }, (_, index) => ({
          uid: serial.current++,
          row: plant.row,
          x: plant.col + 0.78 - index * 0.22,
          damage: definition.projectileDamage,
          kind: definition.projectileKind,
          speed: definition.projectileSpeed,
          maxX: definition.attackRange === undefined ? undefined : plant.col + definition.attackRange,
          slowEffect: definition.slowEffect,
        }));
        newShots.push(...volley);
      }
    });
    const moved = [...projectiles, ...newShots].map((shot) => ({ ...shot, x: shot.x + shot.speed * TICK_MS / 1000 }));
    const consumed = new Set<number>();
    const hits = new Map<number, number>(fireHits);
    const slows = new Map<number, SlowEffect>();
    moved.forEach((shot) => {
      const target = armedZombies
        .filter((zombie) => !claimedZombies.has(zombie.uid) && canProjectileHit(shot, zombie))
        .sort((a, b) => a.x - b.x)[0];
      if (target) {
        consumed.add(shot.uid);
        hits.set(target.uid, (hits.get(target.uid) || 0) + shot.damage);
        if (shot.slowEffect) slows.set(target.uid, shot.slowEffect);
      }
    });
    const attackedZombies = armedZombies.map((zombie) => {
      if (claimedZombies.has(zombie.uid)) return { ...zombie, health: 0 };
      const effect = slows.get(zombie.uid);
      return {
        ...moveZombie(effect ? applySlow(zombie, effect, elapsed) : zombie, damaged),
        health: zombie.health - (hits.get(zombie.uid) || 0),
        hitUntil: hits.has(zombie.uid) ? elapsed + 160 : zombie.hitUntil,
      };
    });
    const released = releaseLaneBalls(attackedZombies, ZOMBIES, elapsed, COLS);
    const outcome = resolveZombieDefeats(released.zombies, ZOMBIES);
    if (released.balls.length) setNotice('T rex released its metal ball! The whole lane is being cleared.');
    if (outcome.kills) setKills((value) => value + outcome.kills);
    if (outcome.reward) setEnergy((value) => value + outcome.reward);
    // A click can add a plant after this tick's snapshot was rendered. Preserve
    // those new IDs instead of overwriting a just-placed plant with old state.
    const tickPlantIds = new Set(plants.map((plant) => plant.uid));
    setPlants((current) => [...damaged, ...current.filter((plant) => !tickPlantIds.has(plant.uid))]);
    setZombies([...outcome.zombies, ...newcomers]);
    setMissiles(activeMissiles);
    setRollingBalls([...rolling.balls, ...released.balls.map((ball) => ({ ...ball, uid: serial.current++ }))]);
    setProjectiles(moved.filter((shot) => shot.x < 9.5 && isProjectileInRange(shot) && !consumed.has(shot.uid)));
  // Elapsed time is the authoritative clock. Every tick renders with the latest
  // entities, then advances the simulation once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, status]);

  useEffect(() => {
    if (status === 'playing' && spawned >= zombiesThisWave && waveKills >= zombiesThisWave && zombies.length === 0 && rollingBalls.length === 0 && missiles.every((missile) => missile.impactAt <= elapsed)) {
      if (currentWave < TOTAL_WAVES) {
        setCurrentWave((wave) => wave + 1);
        setSpawned(0);
        setProjectiles([]);
        setMissiles([]);
        setRollingBalls([]);
        lastSpawnAt.current = elapsed + 2800;
        setNotice(`Wave ${currentWave + 1} begins in 4 seconds. Get ready!`);
      } else {
        setStatus('won');
        setNotice('All three waves cleared. The backyard is safe—for now.');
      }
    }
  }, [currentWave, elapsed, missiles, rollingBalls.length, spawned, status, waveKills, zombies.length, zombiesThisWave]);

  const placePlant = (row: number, col: number) => {
    if (status !== 'playing' || !selectedPlant) return;
    const definition = PLANTS[selectedPlant];
    if (plants.some((plant) => plant.row === row && plant.col === col)) { setNotice('That patch is already occupied.'); return; }
    if (energy < definition.cost) { setNotice(`You need ${definition.cost - energy} more sun.`); return; }
    setEnergy((value) => value - definition.cost);
    setPlants((current) => [...current, {
      uid: serial.current++, type: definition.id, row, col, health: definition.health, lastShotAt: elapsed - 600, pulseUntil: 0, digestUntil: 0,
    }]);
    setNotice(`${definition.name} planted in lane ${row + 1}.`);
  };

  const collectSun = (sun: SunEntity) => {
    if (status !== 'playing') return;
    setEnergy((value) => value + sun.value);
    setSuns((current) => current.filter((item) => item.uid !== sun.uid));
    setNotice(`+${sun.value} sun collected.`);
  };

  const progress = Math.min(100, ((waveKills + spawned * .25) / (zombiesThisWave * 1.25)) * 100);
  const nextSpawn = Math.max(0, Math.ceil((lastSpawnAt.current + getSpawnDelayMs(difficulty, spawned) - elapsed) / 1000));

  return (
    <main className="game-shell">
      <audio ref={audioRef} src="/assets/guardia-de-la-torre.mp3" loop preload="auto" />
      <header className="topbar">
        <a className="brand" href="#" aria-label="Backyard Brigade home">
          <span className="brand-mark">BB</span>
          <span><strong>BACKYARD</strong><b>BRIGADE</b></span>
        </a>
        <div className="mode-bar" role="group" aria-label="Difficulty. Changing mode starts a new game.">
          <span className="mode-label">MODE</span>
          {DIFFICULTY_OPTIONS.map((mode) => {
            const definition = DIFFICULTIES[mode];
            return <button type="button" key={mode} className="mode-option" aria-pressed={difficulty === mode} onClick={() => changeDifficulty(mode)} title={`Start a new ${definition.label} game (${definition.multiplier}× zombies)`}>
              <img src={definition.icon} alt="" width={32} height={32} draggable={false} />
              <span className="mode-copy"><b>{definition.label}</b><small>{definition.multiplier}×</small></span>
            </button>;
          })}
        </div>
        <div className="round-pill"><span /> Wave {currentWave} of {TOTAL_WAVES} · Home turf</div>
        <div className="topbar-actions">
          <button className={`icon-button music-button ${musicEnabled ? '' : 'off'}`} aria-label={musicEnabled ? 'Mute background music' : 'Play background music'} title={musicEnabled ? 'Mute music' : 'Play music'} onClick={toggleMusic}>{musicEnabled ? '♫' : '♪'}</button>
          <button className="icon-button" aria-label={status === 'paused' ? 'Resume game' : 'Pause game'} onClick={togglePause}>{status === 'paused' ? '▶' : 'Ⅱ'}</button>
        </div>
      </header>

      <section className="game-wrap">
        <aside className="seed-bar">
          <div className="sun-counter"><span>☀</span><b>{energy}</b></div>
          <button className={`seed-card ${selectedPlant === 'sprout-scout' ? 'selected' : ''} ${energy < PLANTS['sprout-scout'].cost ? 'unaffordable' : ''}`} onClick={() => setSelectedPlant((value) => value === 'sprout-scout' ? null : 'sprout-scout')} aria-pressed={selectedPlant === 'sprout-scout'}>
            <img src={PLANTS['sprout-scout'].image} alt="" />
            <span><b>{PLANTS['sprout-scout'].name}</b><small>Rapid seed shots</small></span>
            <em>{PLANTS['sprout-scout'].cost}</em>
          </button>
          <button className={`seed-card ${selectedPlant === 'stone-shooter' ? 'selected' : ''} ${energy < PLANTS['stone-shooter'].cost ? 'unaffordable' : ''}`} onClick={() => setSelectedPlant((value) => value === 'stone-shooter' ? null : 'stone-shooter')} aria-pressed={selectedPlant === 'stone-shooter'}>
            <img src={PLANTS['stone-shooter'].image} alt="" />
            <span><b>{PLANTS['stone-shooter'].name}</b><small>Double rock volley</small></span>
            <em>{PLANTS['stone-shooter'].cost}</em>
          </button>
          <button className={`seed-card ${selectedPlant === 'stone-plant' ? 'selected' : ''} ${energy < PLANTS['stone-plant'].cost ? 'unaffordable' : ''}`} onClick={() => setSelectedPlant((value) => value === 'stone-plant' ? null : 'stone-plant')} aria-pressed={selectedPlant === 'stone-plant'}>
            <img src={PLANTS['stone-plant'].image} alt="" />
            <span><b>{PLANTS['stone-plant'].name}</b><small>Swallow · 5s digest</small></span>
            <em>{PLANTS['stone-plant'].cost}</em>
          </button>
          <button className={`seed-card ${selectedPlant === 'watermelon-plant' ? 'selected' : ''} ${energy < PLANTS['watermelon-plant'].cost ? 'unaffordable' : ''}`} onClick={() => setSelectedPlant((value) => value === 'watermelon-plant' ? null : 'watermelon-plant')} aria-pressed={selectedPlant === 'watermelon-plant'}>
            <img src={PLANTS['watermelon-plant'].image} alt="" />
            <span><b>{PLANTS['watermelon-plant'].name}</b><small>2 slices · 1.5× damage</small></span>
            <em>{PLANTS['watermelon-plant'].cost}</em>
          </button>
          <button className={`seed-card ${selectedPlant === 'mooshoom' ? 'selected' : ''}`} onClick={() => setSelectedPlant((value) => value === 'mooshoom' ? null : 'mooshoom')} aria-pressed={selectedPlant === 'mooshoom'} title={PLANTS.mooshoom.description}>
            <img src={PLANTS.mooshoom.image} alt="" />
            <span><b>{PLANTS.mooshoom.name}</b><small>Purple peas · slow · &lt;5 tiles</small></span>
            <em>{PLANTS.mooshoom.cost}</em>
          </button>
          <button className={`seed-card ${selectedPlant === 'fireshroom' ? 'selected' : ''} ${energy < PLANTS.fireshroom.cost ? 'unaffordable' : ''}`} onClick={() => setSelectedPlant((value) => value === 'fireshroom' ? null : 'fireshroom')} aria-pressed={selectedPlant === 'fireshroom'} title={PLANTS.fireshroom.description}>
            <img src="/assets/fireshroom/icon.webp" alt="" />
            <span><b>Fireshroom</b><small>2-tile fire · 3s burn · 5s rest</small></span>
            <em>{PLANTS.fireshroom.cost}</em>
          </button>
          <div className="field-notes"><b>FIELD NOTES</b><p>Hard and Crazy end waves 2 and 3 with T rex bosses. At low health, their metal balls clear an entire lane!</p></div>
        </aside>

        <div className="stage-frame">
          <div className="stage-hud">
            <span className="eyebrow">DAY 01 · HOME TURF</span>
            <div className="wave"><span>WAVE</span><b>{String(currentWave).padStart(2, '0')}/{String(TOTAL_WAVES).padStart(2, '0')}</b><i><u style={{ width: `${progress}%` }} /></i><strong>{waveKills}/{zombiesThisWave}</strong></div>
          </div>
          <div className="yard-scene" aria-label="Cartoon view of the family front yard">
            <div className={`lawn ${selectedPlant ? 'placing' : ''}`} aria-label="Five by nine garden defense grid">
              <div className="house-edge" />
              <div className="entity-layer">
              {Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLS }, (__, col) => (
                <button className="tile" key={`${row}-${col}`} onClick={() => placePlant(row, col)} aria-label={`Plant at lane ${row + 1}, tile ${col + 1}`} />
              )))}
              {plants.map((plant) => {
                const definition = PLANTS[plant.type];
                const devouring = definition.attackMode === 'devour' && plant.pulseUntil > elapsed;
                const digesting = definition.attackMode === 'devour' && plant.digestUntil > elapsed;
                const firePhase = definition.attackMode === 'fire' ? getFirePhase(plant, definition, elapsed) : null;
                const image = definition.attackMode === 'fire' ? firePhase === 'firing' ? definition.firingImage : firePhase === 'recharging' ? definition.rechargeImage : definition.image : definition.attackMode === 'devour' && digesting && !devouring ? definition.digestImage : definition.image;
                return <div className={`plant entity ${definition.attackMode === 'projectile' && plant.pulseUntil > elapsed ? 'firing' : ''} ${devouring ? 'devouring' : ''} ${digesting && !devouring ? 'digesting' : ''}`} key={plant.uid} style={{ left: `${(plant.col + .5) / COLS * 100}%`, top: `${(plant.row + .5) / ROWS * 100}%` }}>
                  <img src={image} alt={`${definition.name}${firePhase === 'firing' ? ' (firing)' : firePhase === 'recharging' ? ' (recharging)' : ''}`} draggable={false} />
                  {plant.health < definition.health && <span className="health"><i style={{ width: `${plant.health / definition.health * 100}%` }} /></span>}
                  {digesting && !devouring && <span className="digest-timer">{Math.max(1, Math.ceil((plant.digestUntil - elapsed) / 1000))}s</span>}
                  {firePhase === 'recharging' && <span className="digest-timer">{Math.ceil((plant.rechargeUntil! - elapsed) / 1000)}s</span>}
                </div>;
              })}
              <div className="fire-effects" aria-hidden="true">{plants.map((plant) => {
                const definition = PLANTS[plant.type];
                if (definition.attackMode !== 'fire' || getFirePhase(plant, definition, elapsed) !== 'firing') return null;
                const frame = Math.floor((elapsed - plant.fireStartedAt!) / 100) % definition.fireFrames.length;
                return <img className="fire-zone" key={plant.uid} src={definition.fireFrames[frame]} alt="" style={{left: `${(plant.col + .5) / COLS * 100 + 1.47}%`, top: `${(plant.row + .5) / ROWS * 100 + 4.625}%`, width: `${definition.attackRange / COLS * 100}%`}} />;
              })}</div>
              <div className="missile-effects" aria-hidden="true">{missiles.map((missile) => {
                const flight = Math.min(1, (elapsed - missile.launchedAt) / (missile.impactAt - missile.launchedAt));
                const x = missile.fromX + (missile.targetCol - missile.fromX) * flight;
                const y = missile.row + .15 + flight * .5 - Math.sin(flight * Math.PI) * .35;
                const impacted = elapsed >= missile.impactAt;
                return <div key={missile.uid}>
                  <span className={`missile-target ${impacted ? 'impacted' : ''}`} style={{ left: `${missile.targetCol / COLS * 100}%`, top: `${missile.row / ROWS * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }} />
                  {impacted ? <span className="missile-explosion" style={{ left: `${(missile.targetCol + .5) / COLS * 100}%`, top: `${(missile.row + .65) / ROWS * 100}%` }}>50</span>
                    : <img className="enemy-missile" src="/assets/horse-missile-zombie/missile.webp" alt="" style={{ left: `${(x + .5) / COLS * 100}%`, top: `${y / ROWS * 100}%` }} />}
                </div>;
              })}</div>
              <div className="rolling-ball-effects" aria-hidden="true">{rollingBalls.map((ball) => <div key={ball.uid}>
                <span className="ball-lane-warning" style={{ top: `${ball.row / ROWS * 100}%`, height: `${100 / ROWS}%` }} />
                <div className="rolling-metal-ball" style={{ left: `${ball.x / COLS * 100}%`, top: `${(ball.row + 1) / ROWS * 100}%` }}>
                  <img src={ball.image} alt="" style={{ transform: `rotate(${-(elapsed - ball.releasedAt) * 1.1}deg)` }} />
                </div>
              </div>)}</div>
              {zombies.map((zombie) => {
                const definition = ZOMBIES[zombie.type];
                const attackFrame = zombie.biting && definition.attackImage && Math.floor(elapsed / 260) % 2 === 0;
                const slowed = zombie.slowUntil > elapsed;
                const recharging = Boolean(definition.missiles && (zombie.missileReadyAt ?? 0) > elapsed);
                const launching = recharging && elapsed < zombie.missileReadyAt! - definition.missiles!.rechargeMs + definition.missiles!.flightMs;
                const image = definition.laneBall && zombie.ballReleased ? definition.laneBall.releasedImage : recharging ? definition.rechargeImage : attackFrame ? definition.attackImage : definition.image;
                return <div className={`zombie entity ${zombie.type} ${zombie.biting ? 'biting' : ''} ${slowed ? 'slowed' : ''} ${launching ? 'launching' : ''} ${zombie.hitUntil > elapsed ? 'hit' : ''}`} key={zombie.uid} style={{ left: `${(zombie.x + .5) / COLS * 100}%`, top: `${(zombie.row + 1) / ROWS * 100}%` }}>
                  <img src={image} alt={`${definition.name}${zombie.ballReleased ? ' (ball released)' : ''}${recharging ? ' (recharging)' : ''}${slowed ? ' (slowed)' : ''}`} draggable={false} />
                  <span className="health enemy-health"><i style={{ width: `${Math.max(0, zombie.health / zombie.maxHealth * 100)}%` }} /></span>
                  {definition.laneBall && <span className="boss-badge">BOSS · {Math.ceil(zombie.health)} HP</span>}
                  {recharging && <span className="missile-reload" aria-label={`Missiles recharge in ${Math.ceil((zombie.missileReadyAt! - elapsed) / 1000)} seconds`}>↻ {Math.ceil((zombie.missileReadyAt! - elapsed) / 1000)}s</span>}
                  {slowed && <span className="slow-status">SLOW</span>}
                </div>;
              })}
              {projectiles.map((shot) => <span className={`projectile ${shot.kind}`} key={shot.uid} style={{ left: `${(shot.x + .5) / COLS * 100}%`, top: `${(shot.row + .5) / ROWS * 100}%` }} />)}
              {suns.map((sun) => <button className="falling-sun" key={sun.uid} style={{ left: `${sun.x}%`, top: `${sun.y}%` }} onClick={() => collectSun(sun)} aria-label={`Collect ${sun.value} sun`}>☀<small>+{sun.value}</small></button>)}
              </div>
              {status !== 'playing' && <div className="game-overlay" role={status === 'lost' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="game-overlay-title">
                <span>{status === 'paused' ? 'FIELD BREAK' : status === 'won' ? 'YARD SECURED' : 'GAME OVER'}</span>
                <h1 id="game-overlay-title">{status === 'paused' ? 'Game paused' : status === 'won' ? 'Nice gardening.' : 'zombie ate your brain'}</h1>
                <p>{status === 'paused' ? `${DIFFICULTIES[difficulty].label} mode · Wave ${currentWave} of ${TOTAL_WAVES}. Take a breath.` : `${DIFFICULTIES[difficulty].label} mode · ${kills} of ${totalZombies} shufflers cleared.`}</p>
                <button onClick={status === 'paused' ? togglePause : restart}>{status === 'paused' ? 'Keep defending' : 'Try again'}</button>
              </div>}
            </div>
          </div>
          <div className="stage-footer" role="status" aria-live="polite">
            <span><kbd>1–6</kbd> Pick plant</span><span><kbd>Click</kbd> Place</span><span><kbd>Space</kbd> Pause</span>
            <p>{notice}</p>
            <strong>{spawned < zombiesThisWave ? `Wave ${currentWave} · next zombie ${nextSpawn}s` : currentWave === TOTAL_WAVES ? 'Final wave deployed' : `Wave ${currentWave} fully deployed`}</strong>
          </div>
        </div>
      </section>
      <p className="tip">An original garden-defense prototype · Plant art and enemy art are custom-generated for this project</p>
    </main>
  );
}
