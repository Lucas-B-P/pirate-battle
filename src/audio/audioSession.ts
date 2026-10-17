import { assetUrl } from '../assetUrl'

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let audioContext: AudioContext | null = null
let unlocked = false
let listenersBound = false

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as WebkitWindow
  return window.AudioContext ?? w.webkitAudioContext ?? null
}

function ensureContext(): AudioContext | null {
  const AC = getAudioContextClass()
  if (!AC) return null
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AC()
  }
  return audioContext
}

async function resumeContext(): Promise<void> {
  const ctx = ensureContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // Ignore — will retry on next gesture.
    }
  }
}

/** Play a near-silent probe so iOS standalone allows later HTMLAudioElement playback. */
function primeHtmlAudio(): void {
  try {
    const probe = new Audio(assetUrl('assets/sounds/ui_click.wav'))
    probe.volume = 0.01
    probe.muted = false
    probe.setAttribute('playsinline', 'true')
    probe.setAttribute('webkit-playsinline', 'true')
    const result = probe.play()
    if (result) {
      void result
        .then(() => {
          probe.pause()
          probe.currentTime = 0
        })
        .catch(() => {
          // Still mark unlocked; next gesture will retry.
        })
    }
  } catch {
    // Ignore.
  }
}

/**
 * Must run inside a user gesture (touch/click). Unlocks WebAudio + HTML audio
 * for iOS Safari and Home Screen (standalone) PWAs.
 */
export function unlockAudioSession(): void {
  void resumeContext()
  if (!unlocked) {
    unlocked = true
    primeHtmlAudio()
  } else {
    // iOS suspends audio when returning from background — re-prime lightly.
    void resumeContext()
  }
}

export function isAudioSessionUnlocked(): boolean {
  return unlocked
}

export function getSharedAudioContext(): AudioContext | null {
  return ensureContext()
}

/** Bind once: any first interaction unlocks; resume when app returns to foreground. */
export function bindAudioSessionGestures(): void {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true

  const onGesture = () => unlockAudioSession()
  window.addEventListener('pointerdown', onGesture, { capture: true })
  window.addEventListener('touchstart', onGesture, { capture: true, passive: true })
  window.addEventListener('touchend', onGesture, { capture: true, passive: true })
  window.addEventListener('keydown', onGesture, { capture: true })

  const onResume = () => {
    if (!unlocked) return
    void resumeContext()
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) onResume()
  })
  window.addEventListener('pageshow', onResume)
  window.addEventListener('focus', onResume)
}
