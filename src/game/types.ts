// MOBA Game Type Definitions

export interface Hero {
  id: string;
  name: string;
  slug: string;
  description: string;
  role: 'warrior' | 'mage' | 'assassin' | 'tank' | 'support';
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  skill1: Skill;
  skill2: Skill;
  ultimate: Skill;
  spriteUrl?: string;
  unlockCostDiamonds: number;
  isStarter: boolean;
}

export interface Skill {
  name: string;
  damage?: number;
  cooldown: number;
  range: number;
  effect?: string;
  duration?: number;
}

export interface GameLevel {
  id: string;
  levelNumber: number;
  name: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'boss' | 'nightmare';
  mapConfig: MapConfig;
  enemyConfig: EnemyConfig[];
  bossConfig?: BossConfig;
  timeLimitSeconds: number;
  rewardDiamonds: number;
  rewardXp: number;
  unlockHeroId?: string;
  unlockAbility?: string;
  storyChapter?: string;
  storyCutscene?: CutsceneConfig;
  difficultyMultiplier: number;
  minPlayerLevel: number;
  entryCostDiamonds: number;
}

export interface MapConfig {
  width: number;
  height: number;
  spawn_x: number;
  spawn_y: number;
  boss_spawn_x?: number;
  boss_spawn_y?: number;
  obstacles?: Obstacle[];
  background?: string;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'tree' | 'rock' | 'water';
}

export interface EnemyConfig {
  type: string;
  hp: number;
  attack: number;
  count: number;
  speed?: number;
  abilities?: string[];
}

export interface BossConfig {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  abilities: string[];
  phases?: BossPhase[];
}

export interface BossPhase {
  hpThreshold: number;
  attackMultiplier: number;
  newAbilities?: string[];
}

export interface CutsceneConfig {
  scenes: CutsceneScene[];
}

export interface CutsceneScene {
  background?: string;
  character?: string;
  dialogue: string;
  duration: number;
}

export interface PlayerProgress {
  id: string;
  userId: string;
  currentLevel: number;
  totalXp: number;
  playerLevel: number;
  highestLevelCompleted: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalKills: number;
  playTimeMinutes: number;
}

export interface PlayerHero {
  id: string;
  heroId: string;
  isFavorite: boolean;
  heroXp: number;
  heroLevel: number;
  skinEquipped: string;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  itemType: 'energy_boost' | 'skill_upgrade' | 'armor' | 'skin' | 'hero';
  effectConfig: Record<string, any>;
  priceDiamonds: number;
  durationSeconds?: number;
  iconUrl?: string;
}

// Game Entity Types
export interface GameEntity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  isAlive: boolean;
}

export interface PlayerEntity extends GameEntity {
  hero: Hero;
  skill1Cooldown: number;
  skill2Cooldown: number;
  ultimateCooldown: number;
  xp: number;
  level: number;
  activeBuffs: Buff[];
}

export interface EnemyEntity extends GameEntity {
  type: string;
  isBoss: boolean;
  targetX?: number;
  targetY?: number;
  aiState: 'idle' | 'chase' | 'attack' | 'retreat';
  abilities: string[];
  currentPhase?: number;
}

export interface Buff {
  type: string;
  multiplier: number;
  duration: number;
  startTime: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
  type: string;
}

// Game State
export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  level: GameLevel | null;
  player: PlayerEntity | null;
  enemies: EnemyEntity[];
  projectiles: Projectile[];
  score: number;
  timeRemaining: number;
  killCount: number;
  isVictory: boolean;
  isDefeat: boolean;
}

// Input State
export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  clickTargetX?: number;
  clickTargetY?: number;
}
