export type PlantId = 'sprout-scout';
export type ZombieId = 'pothead-shambler';

export type PlantDefinition = {
  id: PlantId;
  name: string;
  description: string;
  cost: number;
  health: number;
  fireRateMs: number;
  projectileDamage: number;
  image: string;
};

export type ZombieDefinition = {
  id: ZombieId;
  name: string;
  health: number;
  speed: number;
  damagePerSecond: number;
  reward: number;
  image: string;
};

export type PlantEntity = {
  uid: number;
  type: PlantId;
  row: number;
  col: number;
  health: number;
  lastShotAt: number;
  pulseUntil: number;
};

export type ZombieEntity = {
  uid: number;
  type: ZombieId;
  row: number;
  x: number;
  health: number;
  biting: boolean;
  hitUntil: number;
};

export type ProjectileEntity = {
  uid: number;
  row: number;
  x: number;
  damage: number;
};

export type SunEntity = {
  uid: number;
  x: number;
  y: number;
  value: number;
};

