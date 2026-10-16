import { isE2EMode } from './testApi'

type SoundName =
  | 'cannonFire'
  | 'broadside'
  | 'explosion'
  | 'woodHit'
  | 'score'
  | 'pause'
  | 'resume'
  | 'gameOver'
  | 'complete'
  | 'start'

const SOUND_FILES: Record<SoundName, string[]> = {
  cannonFire: [
    '/assets/sounds/cannon_fire_1.wav',
    '/assets/sounds/cannon_fire_2.wav',
    '/assets/sounds/cannon_fire_3.wav',
  ],
  broadside: ['/assets/sounds/cannon_broadside.wav'],
  explosion: [
    '/assets/sounds/ship_explosion_1.wav',
    '/assets/sounds/ship_explosion_2.wav',
  ],
  woodHit: [
    '/assets/sounds/ship_wood_hit_1.wav',
    '/assets/sounds/ship_wood_hit_2.wav',
  ],
  score: ['/assets/sounds/score_point.wav'],
  pause: ['/assets/sounds/game_pause.wav'],
  resume: ['/assets/sounds/game_resume.wav'],
  gameOver: ['/assets/sounds/game_over.wav'],
  complete: ['/assets/sounds/game_complete.wav'],
  start: ['/assets/sounds/game_start.wav'],
}

function pick(files: string[]): string {
  const index = Math.floor(Math.random() * files.length)
  return files[index] ?? files[0]!
}

export function createGameAudio() {
  const unlocked = { value: false }

  function unlock() {
    unlocked.value = true
  }

  function play(name: SoundName, volume = 0.45) {
    if (isE2EMode() || !unlocked.value) return

    try {
      const audio = new Audio(pick(SOUND_FILES[name]))
      audio.volume = volume
      void audio.play().catch(() => {
        // Autoplay can fail until the user interacts; ignore.
      })
    } catch {
      // Ignore audio errors so gameplay never breaks.
    }
  }

  return { unlock, play }
}

export type GameAudio = ReturnType<typeof createGameAudio>
