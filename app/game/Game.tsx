'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PLANTS, ZOMBIES } from './catalog';
import type { PlantEntity, PlantId, ProjectileEntity, SunEntity, ZombieEntity } from './types';

const ROWS = 5;
const COLS = 9;
const TARGET_KILLS = 12;
const TICK_MS = 50;
const shambler = ZOMBIES['pothead-shambler'];

type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export default function Game() {
  const [energy, setEnergy] = useState(150);
  const [plants, setPlants] = useState<PlantEntity[]>([]);
  const [zombies, setZombies] = useState<ZombieEntity[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);
  const [suns, setSuns] = useState<SunEntity[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantId | null>('sprout-scout');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [kills, setKills] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mowers, setMowers] = useState<boolean[]>(Array(ROWS).fill(true));
  const [notice, setNotice] = useState('Pick a plant, then choose a tile.');
  const serial = useRef(1);
  const lastSpawnAt = useRef(0);
  const lastSunAt = useRef(0);

  const restart = useCallback(() => {
    setEnergy(150); setPlants([]); setZombies([]); setProjectiles([]); setSuns([]);
    setStatus('playing'); setKills(0); setSpawned(0); setElapsed(0);
    setMowers(Array(ROWS).fill(true)); setSelectedPlant('sprout-scout');
    setNotice('Pick a plant, then choose a tile.');
    lastSpawnAt.current = 0; lastSunAt.current = 0;
  }, []);

  const togglePause = useCallback(() => {
    setStatus((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '1') setSelectedPlant('sprout-scout');
      if (event.key === '2') setSelectedPlant('stone-shooter');
      if (event.key === '3') setSelectedPlant('stone-plant');
      if (event.key === 'Escape') setSelectedPlant(null);
      if (event.key === ' ') { event.preventDefault(); togglePause(); }
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
    if (status !== 'playing') return;

    if (spawned < TARGET_KILLS && elapsed - lastSpawnAt.current >= (spawned === 0 ? 1200 : Math.max(2600, 5100 - spawned * 150))) {
      const row = Math.floor(Math.random() * ROWS);
      setZombies((current) => [...current, {
        uid: serial.current++, type: shambler.id, row, x: 9.25,
        health: shambler.health + Math.floor(spawned / 4) * 15, biting: false, hitUntil: 0,
      }]);
      setSpawned((value) => value + 1);
      lastSpawnAt.current = elapsed;
      setNotice(spawned > 7 ? 'Final wave incoming!' : 'A shambler entered the yard.');
    }

    if (elapsed - lastSunAt.current >= 5600) {
      setSuns((current) => [...current.slice(-3), {
        uid: serial.current++, x: 10 + Math.random() * 78, y: 8 + Math.random() * 70, value: 25,
      }]);
      lastSunAt.current = elapsed;
    }

    const claimedZombies = new Set<number>();
    const devours = new Map<number, number>();
    plants.forEach((plant) => {
      const definition = PLANTS[plant.type];
      if (definition.attackMode !== 'devour' || plant.digestUntil > elapsed) return;
      const target = zombies
        .filter((zombie) => !claimedZombies.has(zombie.uid)
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
      setKills((value) => value + claimedZombies.size);
      setEnergy((value) => value + claimedZombies.size * shambler.reward);
      setNotice('Stone Plant swallowed a shambler. Digesting for 5 seconds…');
    }

    setPlants((currentPlants) => {
      const damaged = currentPlants.map((plant) => {
        const attacker = zombies.find((zombie) => zombie.row === plant.row && Math.abs(zombie.x - (plant.col + 0.5)) < 0.52);
        const nextPlant = attacker ? { ...plant, health: plant.health - shambler.damagePerSecond * TICK_MS / 1000 } : plant;
        if (devours.has(plant.uid)) {
          const definition = PLANTS[plant.type];
          if (definition.attackMode === 'devour') {
            return { ...nextPlant, pulseUntil: elapsed + 430, digestUntil: elapsed + definition.digestMs };
          }
        }
        return nextPlant;
      }).filter((plant) => plant.health > 0);

      damaged.forEach((plant) => {
        const definition = PLANTS[plant.type];
        if (definition.attackMode !== 'projectile') return;
        const hasTarget = zombies.some((zombie) => zombie.row === plant.row && zombie.x > plant.col + 0.15);
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
          }));
          setProjectiles((current) => [...current, ...volley]);
        }
      });
      return [...damaged];
    });

    setZombies((currentZombies) => {
      let next = currentZombies.filter((zombie) => !claimedZombies.has(zombie.uid)).map((zombie) => {
        const blockingPlant = plants.find((plant) => plant.row === zombie.row && Math.abs(zombie.x - (plant.col + 0.5)) < 0.52);
        return { ...zombie, biting: Boolean(blockingPlant), x: blockingPlant ? zombie.x : zombie.x - shambler.speed * TICK_MS / 1000 };
      });

      const breachedRows = new Set(next.filter((zombie) => zombie.x < 0.08).map((zombie) => zombie.row));
      breachedRows.forEach((row) => {
        if (mowers[row]) {
          const cleared = next.filter((zombie) => zombie.row === row).length;
          next = next.filter((zombie) => zombie.row !== row);
          if (cleared) setKills((value) => value + cleared);
          setMowers((current) => current.map((ready, index) => index === row ? false : ready));
          setNotice('Lawn mower activated! That lane is now exposed.');
        } else {
          setStatus('lost');
        }
      });
      return next;
    });

    setProjectiles((currentShots) => {
      const moved = currentShots.map((shot) => ({ ...shot, x: shot.x + shot.speed * TICK_MS / 1000 }));
      const consumed = new Set<number>();
      const hits = new Map<number, number>();
      moved.forEach((shot) => {
        const target = zombies
          .filter((zombie) => !claimedZombies.has(zombie.uid) && zombie.row === shot.row && zombie.x >= shot.x - 0.25 && zombie.x <= shot.x + 0.38)
          .sort((a, b) => a.x - b.x)[0];
        if (target) { consumed.add(shot.uid); hits.set(target.uid, (hits.get(target.uid) || 0) + shot.damage); }
      });
      if (hits.size) {
        setZombies((current) => {
          let defeated = 0;
          const survivors = current.map((zombie) => ({
            ...zombie,
            health: zombie.health - (hits.get(zombie.uid) || 0),
            hitUntil: hits.has(zombie.uid) ? elapsed + 160 : zombie.hitUntil,
          })).filter((zombie) => { if (zombie.health <= 0) defeated += 1; return zombie.health > 0; });
          if (defeated) { setKills((value) => value + defeated); setEnergy((value) => value + defeated * shambler.reward); }
          return survivors;
        });
      }
      return moved.filter((shot) => shot.x < 9.5 && !consumed.has(shot.uid));
    });
  // Elapsed time is the authoritative clock. Every tick renders with the latest
  // entities, then advances the simulation once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, status]);

  useEffect(() => {
    if (status === 'playing' && spawned >= TARGET_KILLS && kills >= TARGET_KILLS && zombies.length === 0) {
      setStatus('won'); setNotice('The backyard is safe—for now.');
    }
  }, [kills, spawned, status, zombies.length]);

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
    setEnergy((value) => value + sun.value);
    setSuns((current) => current.filter((item) => item.uid !== sun.uid));
    setNotice(`+${sun.value} sun collected.`);
  };

  const progress = Math.min(100, ((kills + spawned * .25) / (TARGET_KILLS * 1.25)) * 100);
  const nextWave = Math.max(0, Math.ceil(((lastSpawnAt.current + Math.max(2600, 5100 - spawned * 150)) - elapsed) / 1000));

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Backyard Brigade home">
          <span className="brand-mark">BB</span>
          <span><strong>BACKYARD</strong><b>BRIGADE</b></span>
        </a>
        <div className="round-pill"><span /> Round 1 · A quiet afternoon</div>
        <button className="icon-button" aria-label={status === 'paused' ? 'Resume game' : 'Pause game'} onClick={togglePause}>{status === 'paused' ? '▶' : 'Ⅱ'}</button>
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
          <div className="field-notes"><b>FIELD NOTES</b><p>Stone Plants swallow the nearest shambler in front, then digest for 5 seconds.</p></div>
        </aside>

        <div className="stage-frame">
          <div className="stage-hud">
            <span className="eyebrow">DAY 01 · HOME TURF</span>
            <div className="wave"><span>SHUFFLE</span><b>{String(Math.min(spawned + 1, TARGET_KILLS)).padStart(2, '0')}</b><i><u style={{ width: `${progress}%` }} /></i><strong>{kills}/{TARGET_KILLS}</strong></div>
          </div>
          <div className="yard-scene" aria-label="Cartoon view of the family front yard">
            <div className={`lawn ${selectedPlant ? 'placing' : ''}`} aria-label="Five by nine garden defense grid">
              <div className="house-edge" />
              <div className="entity-layer">
              {Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLS }, (__, col) => (
                <button className="tile" key={`${row}-${col}`} onClick={() => placePlant(row, col)} aria-label={`Plant at lane ${row + 1}, tile ${col + 1}`} />
              )))}
              {mowers.map((ready, row) => ready && <div className="mower" key={row} style={{ top: `${(row + .5) / ROWS * 100}%` }}>⇥</div>)}
              {plants.map((plant) => {
                const definition = PLANTS[plant.type];
                const devouring = definition.attackMode === 'devour' && plant.pulseUntil > elapsed;
                const digesting = definition.attackMode === 'devour' && plant.digestUntil > elapsed;
                const image = definition.attackMode === 'devour' && digesting && !devouring ? definition.digestImage : definition.image;
                return <div className={`plant entity ${definition.attackMode === 'projectile' && plant.pulseUntil > elapsed ? 'firing' : ''} ${devouring ? 'devouring' : ''} ${digesting && !devouring ? 'digesting' : ''}`} key={plant.uid} style={{ left: `${(plant.col + .5) / COLS * 100}%`, top: `${(plant.row + .5) / ROWS * 100}%` }}>
                  <img src={image} alt={definition.name} draggable={false} />
                  {plant.health < definition.health && <span className="health"><i style={{ width: `${plant.health / definition.health * 100}%` }} /></span>}
                  {digesting && !devouring && <span className="digest-timer">{Math.max(1, Math.ceil((plant.digestUntil - elapsed) / 1000))}s</span>}
                </div>;
              })}
              {zombies.map((zombie) => <div className={`zombie entity ${zombie.biting ? 'biting' : ''} ${zombie.hitUntil > elapsed ? 'hit' : ''}`} key={zombie.uid} style={{ left: `${(zombie.x + .5) / COLS * 100}%`, top: `${(zombie.row + 1) / ROWS * 100}%` }}>
                <img src={ZOMBIES[zombie.type].image} alt={ZOMBIES[zombie.type].name} draggable={false} />
                <span className="health enemy-health"><i style={{ width: `${Math.max(0, zombie.health / shambler.health * 100)}%` }} /></span>
              </div>)}
              {projectiles.map((shot) => <span className={`projectile ${shot.kind}`} key={shot.uid} style={{ left: `${(shot.x + .5) / COLS * 100}%`, top: `${(shot.row + .5) / ROWS * 100}%` }} />)}
              {suns.map((sun) => <button className="falling-sun" key={sun.uid} style={{ left: `${sun.x}%`, top: `${sun.y}%` }} onClick={() => collectSun(sun)} aria-label={`Collect ${sun.value} sun`}>☀<small>+{sun.value}</small></button>)}
              </div>
              {status !== 'playing' && <div className="game-overlay">
                <span>{status === 'paused' ? 'FIELD BREAK' : status === 'won' ? 'YARD SECURED' : 'PORCH OVERRUN'}</span>
                <h1>{status === 'paused' ? 'Game paused' : status === 'won' ? 'Nice gardening.' : 'The shufflers got through.'}</h1>
                <p>{status === 'paused' ? 'Take a breath. The backyard will wait.' : `${kills} of ${TARGET_KILLS} shufflers cleared.`}</p>
                <button onClick={status === 'paused' ? togglePause : restart}>{status === 'paused' ? 'Keep defending' : 'Try again'}</button>
              </div>}
            </div>
          </div>
          <div className="stage-footer" role="status" aria-live="polite">
            <span><kbd>1–3</kbd> Pick plant</span><span><kbd>Click</kbd> Place</span><span><kbd>Space</kbd> Pause</span>
            <p>{notice}</p>
            <strong>{spawned < TARGET_KILLS ? `Next shambler · ${nextWave}s` : 'Final group deployed'}</strong>
          </div>
        </div>
      </section>
      <p className="tip">An original garden-defense prototype · Plant art and enemy art are custom-generated for this project</p>
    </main>
  );
}
