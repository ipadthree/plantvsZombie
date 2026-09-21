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
    attackMode: 'projectile',
    fireRateMs: 1250,
    projectileDamage: 25,
    projectileKind: 'pea',
    projectilesPerVolley: 1,
    projectileSpeed: 1.85,
    image: '/assets/sprout-scout.png',
  },
  'stone-shooter': {
    id: 'stone-shooter',
    name: 'Stone Shooter',
    description: 'Launches two heavy rocks with every volley.',
    cost: 125,
    health: 150,
    attackMode: 'projectile',
    fireRateMs: 1650,
    projectileDamage: 22,
    projectileKind: 'rock',
    projectilesPerVolley: 2,
    projectileSpeed: 1.55,
    image: '/assets/stone-shooter.png',
  },
  'stone-plant': {
    id: 'stone-plant',
    name: 'Stone Plant',
    description: 'Swallows a nearby shambler, then digests for five seconds.',
    cost: 150,
    health: 125,
    attackMode: 'devour',
    devourRange: 1.05,
    digestMs: 5000,
    image: '/assets/stone-plant.png',
    digestImage: '/assets/stone-plant-digesting.png',
  },
  'watermelon-plant': {
    id: 'watermelon-plant',
    name: 'Watermelon Plant',
    description: 'Fires two watermelon slices, each dealing 1.5× pea damage.',
    cost: 200,
    health: 250,
    attackMode: 'projectile',
    fireRateMs: 1750,
    projectileDamage: 37.5,
    projectileKind: 'watermelon',
    projectilesPerVolley: 2,
    projectileSpeed: 1.45,
    image: '/assets/watermelon-plant.png',
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
