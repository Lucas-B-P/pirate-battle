export type EnemyType = 'chaser' | 'shooter'
export type ProjectileOwner = 'player' | 'enemy'
export type FireSide = 'front' | 'left' | 'right'

export type Vec2 = {
  x: number
  y: number
}

export type Island = {
  id: string
  x: number
  y: number
  radius: number
}

export type ShipEntity = {
  id: string
  x: number
  y: number
  rotation: number
  radius: number
  health: number
  maxHealth: number
  alive: boolean
}

export type EnemyEntity = ShipEntity & {
  type: EnemyType
  cooldown: number
  skin: number
}

export type ProjectileEntity = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  life: number
  owner: ProjectileOwner
  alive: boolean
}

export type ExplosionEffect = {
  id: string
  x: number
  y: number
  life: number
  maxLife: number
}

export type MatchSnapshot = {
  timeLeft: number
  score: number
  playerHealth: number
  playerMaxHealth: number
  paused: boolean
  ended: boolean
  endReason: 'timeout' | 'death' | null
  durationPlayed: number
}

export type SimulationState = {
  player: ShipEntity
  enemies: EnemyEntity[]
  projectiles: ProjectileEntity[]
  explosions: ExplosionEffect[]
  islands: Island[]
  spawnTimer: number
  nextEnemyIsChaser: boolean
  nextChaserSkin: number
  nextShooterSkin: number
  timeLeft: number
  score: number
  paused: boolean
  ended: boolean
  endReason: 'timeout' | 'death' | null
  durationPlayed: number
  frontCooldown: number
  leftCooldown: number
  rightCooldown: number
}
