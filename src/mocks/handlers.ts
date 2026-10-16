import { http, HttpResponse, delay } from 'msw'
import type { MatchRecord, PaginatedResponse } from '../types/match'
import {
  findMatchById,
  getAllMatches,
  saveConfirmedMatch,
} from './data'
import { loadNetworkScenario } from './networkScenario'

const API_URL = '/api'

function sortByScore(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    // Deterministic tie-break: earlier match wins.
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  const start = (safePage - 1) * safeSize
  const slice = items.slice(start, start + safeSize)
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize))

  return {
    items: slice,
    page: safePage,
    pageSize: safeSize,
    totalItems,
    totalPages,
  }
}

async function applyScenarioDelay(): Promise<void> {
  const scenario = loadNetworkScenario()

  if (scenario === 'slow') {
    await delay(1200)
    return
  }

  await delay(200)
}

export const handlers = [
  http.get(`${API_URL}/ranking`, async ({ request }) => {
    const scenario = loadNetworkScenario()
    await applyScenarioDelay()

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'Failed to load ranking' },
        { status: 500 },
      )
    }

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '5')
    const sessionTime = url.searchParams.get('sessionTimeSeconds')
    const spawnTime = url.searchParams.get('enemySpawnTimeSeconds')

    if (scenario === 'empty') {
      return HttpResponse.json(paginate([], page, pageSize))
    }

    let matches = getAllMatches()

    if (sessionTime && spawnTime) {
      matches = matches.filter(
        (match) =>
          match.config.sessionTimeSeconds === Number(sessionTime) &&
          match.config.enemySpawnTimeSeconds === Number(spawnTime),
      )
    }

    return HttpResponse.json(paginate(sortByScore(matches), page, pageSize))
  }),

  http.get(`${API_URL}/history/:playerId`, async ({ params, request }) => {
    const scenario = loadNetworkScenario()
    await applyScenarioDelay()

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'Failed to load match history' },
        { status: 500 },
      )
    }

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '5')
    const playerId = String(params.playerId)

    if (scenario === 'empty') {
      return HttpResponse.json(paginate([], page, pageSize))
    }

    const matches = getAllMatches()
      .filter((match) => match.playerId === playerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return HttpResponse.json(paginate(matches, page, pageSize))
  }),

  http.post(`${API_URL}/history`, async ({ request }) => {
    const scenario = loadNetworkScenario()
    await applyScenarioDelay()

    if (scenario === 'timeout-on-register') {
      await delay(4000)
      return HttpResponse.json(
        { message: 'Register timeout' },
        { status: 504 },
      )
    }

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'Failed to register match' },
        { status: 500 },
      )
    }

    const body = (await request.json()) as MatchRecord
    const existing = findMatchById(body.id)

    if (existing) {
      // Idempotent: repeated submit returns the same record.
      return HttpResponse.json(existing, { status: 200 })
    }

    const saved = saveConfirmedMatch(body)
    return HttpResponse.json(saved, { status: 201 })
  }),
]
