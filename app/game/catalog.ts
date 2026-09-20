import type { PlantDefinition, PlantId, ZombieDefinition, ZombieId } from './types';

// Add custom characters here. The game loop reads behavior values from these
// registries, so new artwork and balance numbers do not require engine changes.
export const PLANTS: Record<PlantId, PlantDefinition> = {
  'sprout-scout': {
    id: 'sprout-scout',
    name: 'Sprout Scout',
    description: 'Fires quick garden peas down its lane.',
    cost: 100,
    health: 100,
    fireRateMs: 1250,
    projectileDamage: 25,
    image: '/assets/sprout-scout.png',
  },
};

export const ZOMBIES: Record<ZombieId, ZombieDefinition> = {
  'pothead-shambler': {
    id: 'pothead-shambler',
    name: 'Pothead Shambler',
    health: 125,
    speed: 0.105,
    damagePerSecond: 17,
    reward: 20,
    image: '/assets/pothead-shambler.png',
  },
};
