import {
  isAudioSessionUnlocked,
  unlockAudioSession,
} from '../audio/audioSession'
import { assetUrl } from '../assetUrl'
import { DEFAULT_SFX_VOLUME } from '../config/gameConfig'
import { loadPlayerOptions } from '../storage/optionsStorage'
import { isE2EMode } from './testApi'

function readSfxVolume(): number {
  try {
    return loadPlayerOptions().sfxVolume
  } catch {
    return DEFAULT_SFX_VOLUME
  }
}

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
    assetUrl('assets/sounds/cannon_fire_1.wav'),
    assetUrl('assets/sounds/cannon_fire_2.wav'),
    assetUrl('assets/sounds/cannon_fire_3.wav'),
  ],
  broadside: [assetUrl('assets/sounds/cannon_broadside.wav')],
  explosion: [
    assetUrl('assets/sounds/ship_explosion_1.wav'),
    assetUrl('assets/sounds/ship_explosion_2.wav'),
  ],
  woodHit: [
    assetUrl('assets/sounds/ship_wood_hit_1.wav'),
    assetUrl('assets/sounds/ship_wood_hit_2.wav'),
  ],
  score: [assetUrl('assets/sounds/score_point.wav')],
  pause: [assetUrl('assets/sounds/game_pause.wav')],
  resume: [assetUrl('assets/sounds/game_resume.wav')],
  gameOver: [assetUrl('assets/sounds/game_over.wav')],
  complete: [assetUrl('assets/sounds/game_complete.wav')],
  start: [assetUrl('assets/sounds/game_start.wav')],
}

const POOL_SIZE = 3
const pools = new Map<string, HTMLAudioElement[]>()
let poolWarmed = false

function pick(files: string[]): string {
  const index = Math.floor(Math.random() * files.length)
  return files[index] ?? files[0]!
}

function prepareElement(url: string): HTMLAudioElement {
  const audio = new Audio(url)
  audio.preload = 'auto'
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  return audio
}

function getPooledAudio(url: string): HTMLAudioElement {
  let pool = pools.get(url)
  if (!pool) {
    pool = []
    pools.set(url, pool)
  }

  const idle = pool.find((item) => item.paused || item.ended)
  if (idle) return idle

  const audio = prepareElement(url)
  pool.push(audio)
  if (pool.length > POOL_SIZE) {
    const dropped = pool.shift()
    dropped?.removeAttribute('src')
  }
  return audio
}

function warmPool(): void {
  if (poolWarmed) return
  poolWarmed = true
  for (const files of Object.values(SOUND_FILES)) {
    const url = files[0]
    if (!url || pools.has(url)) continue
    const audio = prepareElement(url)
    audio.volume = 0.001
    pools.set(url, [audio])
    const result = audio.play()
    if (result) {
      void result
        .then(() => {
          audio.pause()
          audio.currentTime = 0
        })
        .catch(() => {})
    }
  }
}

export function createGameAudio() {
  function unlock() {
    unlockAudioSession()
    warmPool()
  }

  function play(name: SoundName, volume = 0.45) {
    if (isE2EMode()) return
    if (!isAudioSessionUnlocked()) return

    const sfxScale = readSfxVolume()
    if (sfxScale <= 0.001) return

    try {
      const url = pick(SOUND_FILES[name])
      const audio = getPooledAudio(url)
      audio.volume = Math.min(1, volume * sfxScale)
      try {
        audio.currentTime = 0
      } catch {
        // Some iOS builds throw if metadata is not ready yet.
      }
      void audio.play().catch(() => {
        // Autoplay can still fail until another gesture; ignore.
      })
    } catch {
      // Ignore audio errors so gameplay never breaks.
    }
  }

  return { unlock, play }
}

export type GameAudio = ReturnType<typeof createGameAudio>
