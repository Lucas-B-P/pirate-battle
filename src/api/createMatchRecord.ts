import type { GameConfig } from '../config/gameConfig'
import { getPlayerId, getPlayerName } from '../storage/playerStorage'
import type { MatchEndReason, MatchRecord } from '../types/match'

function createMatchId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createMatchRecord(input: {
  score: number
  durationSeconds: number
  endReason: MatchEndReason
  config: GameConfig
}): MatchRecord {
  return {
    id: createMatchId(),
    playerId: getPlayerId(),
    playerName: getPlayerName(),
    createdAt: new Date().toISOString(),
    score: input.score,
    durationSeconds: input.durationSeconds,
    endReason: input.endReason,
    config: {
      sessionTimeSeconds: input.config.sessionTimeSeconds,
      enemySpawnTimeSeconds: input.config.enemySpawnTimeSeconds,
    },
  }
}
