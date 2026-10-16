import type { GameConfig } from '../config/gameConfig'

export type MatchEndReason = 'timeout' | 'death'

export type MatchRecord = {
  id: string
  playerId: string
  playerName: string
  createdAt: string
  score: number
  durationSeconds: number
  endReason: MatchEndReason
  config: Pick<GameConfig, 'sessionTimeSeconds' | 'enemySpawnTimeSeconds'>
}

export type PaginatedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type RegisterStatus = 'idle' | 'pending' | 'saving' | 'success' | 'error'

export type LastMatchResult = {
  matchId: string
  score: number
  durationSeconds: number
  endReason: MatchEndReason
  savedAt: string
  registerStatus: RegisterStatus
  config: Pick<GameConfig, 'sessionTimeSeconds' | 'enemySpawnTimeSeconds'>
  errorMessage?: string
}
