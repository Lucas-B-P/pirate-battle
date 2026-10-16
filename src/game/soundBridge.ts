import type { GameAudio } from './audio'
import type { SimulationState } from './types'

type SoundTracker = {
  score: number
  playerHealth: number
  projectileCount: number
  explosionCount: number
  paused: boolean
  ended: boolean
}

export function createSoundTracker(state: SimulationState): SoundTracker {
  return {
    score: state.score,
    playerHealth: state.player.health,
    projectileCount: state.projectiles.length,
    explosionCount: state.explosions.length,
    paused: state.paused,
    ended: state.ended,
  }
}

export function playStateSounds(
  audio: GameAudio,
  tracker: SoundTracker,
  state: SimulationState,
  firedSide: 'none' | 'front' | 'side',
) {
  if (firedSide === 'front') audio.play('cannonFire', 0.4)
  if (firedSide === 'side') audio.play('broadside', 0.5)

  if (state.score > tracker.score) audio.play('score', 0.55)
  if (state.player.health < tracker.playerHealth) audio.play('woodHit', 0.5)
  if (state.explosions.length > tracker.explosionCount) {
    audio.play('explosion', 0.55)
  }

  if (state.paused && !tracker.paused) audio.play('pause', 0.45)
  if (!state.paused && tracker.paused) audio.play('resume', 0.45)

  if (state.ended && !tracker.ended) {
    audio.play(state.endReason === 'death' ? 'gameOver' : 'complete', 0.6)
  }

  tracker.score = state.score
  tracker.playerHealth = state.player.health
  tracker.projectileCount = state.projectiles.length
  tracker.explosionCount = state.explosions.length
  tracker.paused = state.paused
  tracker.ended = state.ended
}
