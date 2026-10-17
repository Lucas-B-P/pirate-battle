import { assetUrl } from '../assetUrl'
import {
  DEFAULT_GAME_MUSIC_VOLUME,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_SFX_VOLUME,
} from '../config/gameConfig'
import { isE2EMode } from '../game/testApi'
import { loadPlayerOptions } from '../storage/optionsStorage'
import {
  bindAudioSessionGestures,
  isAudioSessionUnlocked,
  unlockAudioSession,
} from './audioSession'

let menuMusic: HTMLAudioElement | null = null
let gameMusic: HTMLAudioElement | null = null
let menuMusicVolume = DEFAULT_MUSIC_VOLUME
let gameMusicVolume = DEFAULT_GAME_MUSIC_VOLUME
let sfxVolume = DEFAULT_SFX_VOLUME
let bootStarted = false
let retryTimer: number | null = null
let gameMusicActive = false

function readStoredVolumes() {
  try {
    const options = loadPlayerOptions()
    return {
      musicVolume: options.musicVolume,
      gameMusicVolume: options.gameMusicVolume,
      sfxVolume: options.sfxVolume,
    }
  } catch {
    return {
      musicVolume: DEFAULT_MUSIC_VOLUME,
      gameMusicVolume: DEFAULT_GAME_MUSIC_VOLUME,
      sfxVolume: DEFAULT_SFX_VOLUME,
    }
  }
}

function tagInline(audio: HTMLAudioElement) {
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
}

function ensureMenuMusic() {
  if (!menuMusic) {
    const embedded = document.getElementById(
      'menu-theme',
    ) as HTMLAudioElement | null
    menuMusic = embedded ?? new Audio(assetUrl('assets/sounds/sail_the_silly_sea.mp3'))
    menuMusic.loop = true
    menuMusic.preload = 'auto'
    tagInline(menuMusic)
    if (!menuMusic.getAttribute('src') && !embedded) {
      menuMusic.src = assetUrl('assets/sounds/sail_the_silly_sea.mp3')
    }
  }
  menuMusic.volume = menuMusicVolume
  return menuMusic
}

function ensureGameMusic() {
  if (!gameMusic) {
    gameMusic = new Audio(assetUrl('assets/sounds/deck_to_mine.mp3'))
    gameMusic.loop = true
    gameMusic.preload = 'auto'
    tagInline(gameMusic)
  }
  gameMusic.volume = gameMusicVolume
  return gameMusic
}

function tryPlayMenu() {
  if (isE2EMode() || gameMusicActive) return
  const audio = ensureMenuMusic()
  audio.volume = menuMusicVolume
  if (menuMusicVolume <= 0.001) {
    audio.pause()
    return
  }
  const playResult = audio.play()
  if (playResult) {
    void playResult
      .then(() => {
        stopRetryLoop()
      })
      .catch(() => {
        // Browser blocked autoplay — keep retrying after unlock.
      })
  }
}

function tryPlayGame() {
  if (isE2EMode() || !gameMusicActive) return
  const audio = ensureGameMusic()
  audio.volume = gameMusicVolume
  if (gameMusicVolume <= 0.001) {
    audio.pause()
    return
  }
  const playResult = audio.play()
  if (playResult) {
    void playResult.catch(() => {
      // Autoplay may still need a prior gesture.
    })
  }
}

function stopRetryLoop() {
  if (retryTimer !== null) {
    window.clearInterval(retryTimer)
    retryTimer = null
  }
}

function startRetryLoop() {
  if (retryTimer !== null || isE2EMode()) return
  let attempts = 0
  retryTimer = window.setInterval(() => {
    attempts += 1
    if (isAudioSessionUnlocked()) {
      tryPlayMenu()
    }
    if (attempts >= 40 || (menuMusic && !menuMusic.paused)) {
      stopRetryLoop()
    }
  }, 400)
}

export function unlockUiAudio() {
  unlockAudioSession()
  // Warm both music elements inside the gesture so iOS standalone allows later plays.
  const menu = ensureMenuMusic()
  const game = ensureGameMusic()
  const warm = (audio: HTMLAudioElement) => {
    const previous = audio.volume
    audio.volume = Math.max(0.01, previous || 0.01)
    const result = audio.play()
    if (result) {
      void result
        .then(() => {
          if (!gameMusicActive && audio === game) {
            audio.pause()
            audio.currentTime = 0
          }
          if (gameMusicActive && audio === menu) {
            audio.pause()
            audio.currentTime = 0
          }
          audio.volume = audio === menu ? menuMusicVolume : gameMusicVolume
        })
        .catch(() => {
          audio.volume = audio === menu ? menuMusicVolume : gameMusicVolume
        })
    }
  }
  warm(menu)
  warm(game)

  if (gameMusicActive) {
    tryPlayGame()
  } else {
    tryPlayMenu()
  }
}

export function setMenuMusicVolume(volume: number) {
  menuMusicVolume = Math.min(1, Math.max(0, volume))
  if (menuMusic) {
    menuMusic.volume = menuMusicVolume
    if (menuMusicVolume <= 0.001) {
      menuMusic.pause()
    } else if (!gameMusicActive && isAudioSessionUnlocked()) {
      tryPlayMenu()
    }
  }
}

export function setGameMusicVolume(volume: number) {
  gameMusicVolume = Math.min(1, Math.max(0, volume))
  if (gameMusic) {
    gameMusic.volume = gameMusicVolume
    if (gameMusicVolume <= 0.001) {
      gameMusic.pause()
    } else if (gameMusicActive) {
      tryPlayGame()
    }
  }
}

export function setSfxVolume(volume: number) {
  sfxVolume = Math.min(1, Math.max(0, volume))
}

export function getMenuMusicVolume() {
  return menuMusicVolume
}

export function getGameMusicVolume() {
  return gameMusicVolume
}

export function getSfxVolume() {
  return sfxVolume
}

export function playUiSound(name: 'click' | 'open' | 'back' | 'hover') {
  if (isE2EMode() || sfxVolume <= 0.001) return
  unlockAudioSession()
  const file =
    name === 'click'
      ? 'assets/sounds/ui_click.wav'
      : name === 'open'
        ? 'assets/sounds/ui_open.wav'
        : name === 'back'
          ? 'assets/sounds/ui_back.wav'
          : 'assets/sounds/ui_hover.wav'

  try {
    const audio = new Audio(assetUrl(file))
    tagInline(audio)
    audio.volume = (name === 'hover' ? 0.22 : 0.4) * sfxVolume
    void audio.play().catch(() => {})
  } catch {
    // Ignore autoplay failures.
  }
}

/** Call once at app boot — starts theme without waiting for a menu click. */
export function bootMenuAudio() {
  if (bootStarted || isE2EMode()) return
  bootStarted = true

  const stored = readStoredVolumes()
  menuMusicVolume = stored.musicVolume
  gameMusicVolume = stored.gameMusicVolume
  sfxVolume = stored.sfxVolume

  bindAudioSessionGestures()
  ensureMenuMusic()
  ensureGameMusic()
  tryPlayMenu()
  startRetryLoop()

  // Fallback if the browser still requires a gesture.
  const unlock = () => unlockUiAudio()
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
  window.addEventListener('touchstart', unlock, { capture: true, passive: true })
  window.addEventListener('touchend', unlock, { capture: true, passive: true })
}

export function startMenuAmbience() {
  if (isE2EMode()) return
  const stored = readStoredVolumes()
  menuMusicVolume = stored.musicVolume
  gameMusicVolume = stored.gameMusicVolume
  sfxVolume = stored.sfxVolume
  stopGameMusic()
  if (isAudioSessionUnlocked()) {
    tryPlayMenu()
  }
}

export function stopMenuAmbience() {
  if (!menuMusic) return
  menuMusic.pause()
  menuMusic.currentTime = 0
}

export function pauseMenuAmbience() {
  if (!menuMusic) return
  menuMusic.pause()
}

export function startGameMusic() {
  if (isE2EMode()) return
  const stored = readStoredVolumes()
  gameMusicVolume = stored.gameMusicVolume
  gameMusicActive = true
  stopMenuAmbience()
  const audio = ensureGameMusic()
  audio.currentTime = 0
  if (isAudioSessionUnlocked()) {
    tryPlayGame()
  } else {
    // Will start on next gesture via unlockUiAudio / session binders.
    unlockAudioSession()
    tryPlayGame()
  }
}

export function stopGameMusic() {
  gameMusicActive = false
  if (!gameMusic) return
  gameMusic.pause()
  gameMusic.currentTime = 0
}

export function pauseGameMusic() {
  if (!gameMusic) return
  gameMusic.pause()
}

export function resumeGameMusic() {
  if (!gameMusicActive) return
  tryPlayGame()
}
