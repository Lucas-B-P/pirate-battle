import { Emitter, type EmitterConfigV3 } from '@spd789562/particle-emitter'
import { ParticleContainer, Texture } from 'pixi.js'
import { TILE_SIZE } from './arena'
import { directionFromRotation } from './math'

type WakeEmitter = {
  id: string
  emitter: Emitter
  lastX: number
  lastY: number
}

let sharedFoamTexture: Texture | null = null

function createFoamTexture(): Texture {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return Texture.WHITE
  }

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  gradient.addColorStop(0.35, 'rgba(210, 236, 255, 0.55)')
  gradient.addColorStop(0.7, 'rgba(150, 205, 235, 0.2)')
  gradient.addColorStop(1, 'rgba(120, 180, 220, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  return Texture.from(canvas)
}

function getFoamTexture(): Texture {
  if (!sharedFoamTexture || sharedFoamTexture.destroyed) {
    sharedFoamTexture = createFoamTexture()
  }
  return sharedFoamTexture
}

function wakeConfig(texture: Texture, dense: boolean, lite: boolean): EmitterConfigV3 {
  const scale = TILE_SIZE / 64
  return {
    lifetime: { min: lite ? 0.45 : 0.55, max: lite ? 0.95 : 1.15 },
    frequency: lite ? (dense ? 0.04 : 0.065) : dense ? 0.016 : 0.028,
    spawnChance: 1,
    particlesPerWave: lite ? 1 : dense ? 3 : 2,
    maxParticles: lite ? (dense ? 70 : 40) : dense ? 280 : 160,
    addAtBack: true,
    pos: { x: 0, y: 0 },
    emit: false,
    behaviors: [
      {
        type: 'alpha',
        config: {
          alpha: {
            list: [
              { value: 0.7, time: 0 },
              { value: 0.35, time: 0.35 },
              { value: 0, time: 1 },
            ],
          },
        },
      },
      {
        type: 'scale',
        config: {
          scale: {
            list: [
              { value: 0.45 * scale, time: 0 },
              { value: 1.35 * scale, time: 1 },
            ],
          },
          minMult: 0.65,
        },
      },
      {
        type: 'color',
        config: {
          color: {
            list: [
              { value: 'f4fbff', time: 0 },
              { value: 'b7e0f5', time: 0.45 },
              { value: '7eb6d6', time: 1 },
            ],
          },
        },
      },
      {
        type: 'moveSpeed',
        config: {
          speed: {
            list: [
              { value: 55 * scale, time: 0 },
              { value: 12 * scale, time: 1 },
            ],
          },
          minMult: 0.55,
        },
      },
      {
        type: 'rotation',
        config: {
          accel: 0,
          minSpeed: 0,
          maxSpeed: lite ? 0 : 12,
          // Spread relative to emitter.rotate() (already aimed aft).
          minStart: lite ? -18 : -28,
          maxStart: lite ? 18 : 28,
        },
      },
      {
        type: 'spawnShape',
        config: {
          type: 'torus',
          data: {
            radius: (lite ? 10 : 14) * scale,
            innerRadius: 0,
            affectRotation: false,
          },
        },
      },
      {
        type: 'textureSingle',
        config: { texture },
      },
    ],
  }
}

export type ShipWakeSystem = {
  container: ParticleContainer
  syncShip: (options: {
    id: string
    x: number
    y: number
    rotation: number
    alive: boolean
    moving: boolean
    dense?: boolean
  }) => void
  prune: (liveIds: Set<string>) => void
  update: (dt: number) => void
  destroy: () => void
}

export function createShipWakeSystem(lite = false): ShipWakeSystem {
  const foamTexture = getFoamTexture()
  const container = new ParticleContainer({
    dynamicProperties: {
      position: true,
      scale: true,
      // Rotation stays static after spawn on mobile; cheaper batch updates.
      rotation: !lite,
      color: true,
    },
  })
  container.label = 'ship-wakes'

  const emitters = new Map<string, WakeEmitter>()
  const sternDistance = TILE_SIZE * 0.48

  function getOrCreate(id: string, dense: boolean): WakeEmitter {
    const existing = emitters.get(id)
    if (existing) return existing

    const emitter = new Emitter(container, wakeConfig(foamTexture, dense, lite), foamTexture)
    emitter.emit = false
    const entry: WakeEmitter = {
      id,
      emitter,
      lastX: Number.NaN,
      lastY: Number.NaN,
    }
    emitters.set(id, entry)
    return entry
  }

  function syncShip(options: {
    id: string
    x: number
    y: number
    rotation: number
    alive: boolean
    moving: boolean
    dense?: boolean
  }) {
    const entry = getOrCreate(options.id, Boolean(options.dense))
    const forward = directionFromRotation(options.rotation)
    // Stern = opposite of movement/bow.
    const sternX = options.x - forward.x * sternDistance
    const sternY = options.y - forward.y * sternDistance

    entry.emitter.updateOwnerPos(sternX, sternY)
    // Particle-emitter 0° = +X; spray opposite to bow.
    const aftDegrees =
      (Math.atan2(-forward.y, -forward.x) * 180) / Math.PI
    entry.emitter.rotate(aftDegrees)
    entry.emitter.emit = options.alive && options.moving && !Number.isNaN(entry.lastX)
    entry.lastX = options.x
    entry.lastY = options.y
  }

  function prune(liveIds: Set<string>) {
    for (const [id, entry] of emitters) {
      if (liveIds.has(id)) continue
      entry.emitter.emit = false
      entry.emitter.cleanup()
      entry.emitter.destroy()
      emitters.delete(id)
    }
  }

  function update(dt: number) {
    for (const entry of emitters.values()) {
      entry.emitter.update(dt)
    }
  }

  function destroy() {
    for (const entry of emitters.values()) {
      entry.emitter.destroy()
    }
    emitters.clear()
    container.destroy({ children: true })
    // Keep shared foam texture for the next match (page-lifetime cache).
  }

  return { container, syncShip, prune, update, destroy }
}
