export type PlantId = 'sprout-scout' | 'stone-shooter' | 'stone-plant' | 'watermelon-plant' | 'mooshoom' | 'fireshroom' | 'bubble-shooter';
export type ZombieId = 'pothead-shambler' | 'log-zombie' | 'horse-missile-zombie' | 'zombie-horse' | 't-rex-zombie' | 'boss-zombie' | 'imp-zombie';
export type ProjectileKind = 'pea' | 'rock' | 'watermelon' | 'purple-pea' | 'bubble';

export type SlowEffect = {
  movementMultiplier: number;
  durationMs: number;
};

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
  attackRange?: number;
  slowEffect?: SlowEffect;
  canHitAirborne?: boolean;
  airborneImage?: string;
};

export type DevourPlantDefinition = PlantDefinitionBase & {
  attackMode: 'devour';
  devourRange: number;
  digestMs: number;
  digestImage: string;
};

export type FirePlantDefinition = PlantDefinitionBase & {
  attackMode: 'fire'; attackRange: number; burstDamage: number;
  fireDurationMs: number; rechargeMs: number;
  firingImage: string; rechargeImage: string; fireFrames: string[];
};
export type PlantDefinition = ProjectilePlantDefinition | DevourPlantDefinition | FirePlantDefinition;

export type ZombieDefinition = {
  id: ZombieId;
  name: string;
  health: number;
  speed: number;
  damagePerSecond: number;
  reward: number;
  airborne?: boolean;
  image: string;
  attackImage?: string;
  rechargeImage?: string;
  devourDamageRatio?: number;
  missiles?: { damage: number; count: number; rechargeMs: number; flightMs: number };
  laneBall?: { releaseHealthRatio: number; speed: number; releasedImage: string; ballImage: string };
  bossLoadout?: {
    tntRechargeMs: number; impRechargeMs: number; flightMs: number;
    tntEmptyImage: string; impsEmptyImage: string; emptyImage: string; tntImage: string;
  };
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
  fireStartedAt?: number;
  rechargeUntil?: number;
  aimingAirborne?: boolean;
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
  slowUntil: number;
  slowMultiplier: number;
  missileReadyAt?: number;
  ballReleased?: boolean;
  tntReadyAt?: number;
  impReadyAt?: number;
  bossPulseUntil?: number;
  airborne?: boolean;
};

export type TntEntity = {
  uid: number; row: number; fromX: number; targetCols: number[];
  launchedAt: number; impactAt: number;
};

export type ImpFlightEntity = {
  uid: number; fromRow: number; row: number; fromX: number; x: number;
  launchedAt: number; landAt: number;
};

export type RollingBallEntity = {
  uid: number;
  row: number;
  x: number;
  speed: number;
  releasedAt: number;
  image: string;
};

export type MissileEntity = {
  uid: number;
  row: number;
  fromX: number;
  targetCol: number;
  damage: number;
  launchedAt: number;
  impactAt: number;
};

export type ProjectileEntity = {
  uid: number;
  row: number;
  x: number;
  damage: number;
  kind: ProjectileKind;
  speed: number;
  maxX?: number;
  slowEffect?: SlowEffect;
  airborne?: boolean;
};

export type SunEntity = {
  uid: number;
  x: number;
  y: number;
  value: number;
};
