import type { Vec2 } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function circlesOverlap(
  a: Vec2 & { radius: number },
  b: Vec2 & { radius: number },
): boolean {
  return distance(a, b) < a.radius + b.radius
}

/** Rotation 0 faces up (north), matching ship sprites. */
export function directionFromRotation(rotation: number): Vec2 {
  return {
    x: Math.sin(rotation),
    y: -Math.cos(rotation),
  }
}

export function angleTowards(from: Vec2, to: Vec2): number {
  return Math.atan2(to.x - from.x, from.y - to.y)
}

export function normalizeAngle(angle: number): number {
  let value = angle
  while (value > Math.PI) value -= Math.PI * 2
  while (value < -Math.PI) value += Math.PI * 2
  return value
}

export function rotateTowards(
  current: number,
  target: number,
  maxStep: number,
): number {
  const diff = normalizeAngle(target - current)
  if (Math.abs(diff) <= maxStep) {
    return target
  }
  return current + Math.sign(diff) * maxStep
}
