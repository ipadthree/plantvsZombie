export type PlantId = 'sprout-scout' | 'stone-shooter' | 'stone-plant' | 'watermelon-plant';
export type ZombieId = 'pothead-shambler' | 'log-zombie';
export type ProjectileKind = 'pea' | 'rock' | 'watermelon';

type PlantDefinitionBase = {
  id: PlantId;
  name: string;
  description: string;
  cost: number;
  health: number;
  image: string;
};

export type ProjectilePlantDefinition = PlantDefinitionBase & {
  attackMode: 'projectile';
  fireRateMs: number;
  projectileDamage: number;
  projectileKind: ProjectileKind;
  projectilesPerVolley: number;
  projectileSpeed: number;
};

export type DevourPlantDefinition = PlantDefinitionBase & {
  attackMode: 'devour';
  devourRange: number;
  digestMs: number;
  digestImage: string;
};

export type PlantDefinition = ProjectilePlantDefinition | DevourPlantDefinition;

export type ZombieDefinition = {
  id: ZombieId;
  name: string;
  health: number;
  speed: number;
  damagePerSecond: number;
  reward: number;
  image: string;
  attackImage?: string;
};

export type PlantEntity = {
  uid: number;
  type: PlantId;
  row: number;
  col: number;
  health: number;
  lastShotAt: number;
  pulseUntil: number;
  digestUntil: number;
};

export type ZombieEntity = {
  uid: number;
  type: ZombieId;
  row: number;
  x: number;
  health: number;
  maxHealth: number;
  biting: boolean;
  hitUntil: number;
};

export type ProjectileEntity = {
  uid: number;
  row: number;
  x: number;
  damage: number;
  kind: ProjectileKind;
  speed: number;
};

export type SunEntity = {
  uid: number;
  x: number;
  y: number;
  value: number;
};
