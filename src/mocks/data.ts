import type { MatchRecord } from '../types/match'
import { STORAGE_KEYS } from '../storage/storageKeys'

const FIXTURE_MATCHES: MatchRecord[] = [
  {
    id: 'fixture_1',
    playerId: 'npc_anne',
    playerName: 'Anne Bonny',
    createdAt: '2026-03-01T12:00:00.000Z',
    score: 18,
    durationSeconds: 90,
    endReason: 'timeout',
    config: { sessionTimeSeconds: 90, enemySpawnTimeSeconds: 3 },
  },
  {
    id: 'fixture_2',
    playerId: 'npc_blackbeard',
    playerName: 'Blackbeard',
    createdAt: '2026-03-02T15:30:00.000Z',
    score: 14,
    durationSeconds: 75,
    endReason: 'death',
    config: { sessionTimeSeconds: 90, enemySpawnTimeSeconds: 3 },
  },
  {
    id: 'fixture_3',
    playerId: 'npc_mary',
    playerName: 'Mary Read',
    createdAt: '2026-03-03T09:10:00.000Z',
    score: 11,
    durationSeconds: 90,
    endReason: 'timeout',
    config: { sessionTimeSeconds: 90, enemySpawnTimeSeconds: 3 },
  },
  {
    id: 'fixture_4',
    playerId: 'npc_drake',
    playerName: 'Francis Drake',
    createdAt: '2026-03-04T18:45:00.000Z',
    score: 9,
    durationSeconds: 60,
    endReason: 'death',
    config: { sessionTimeSeconds: 60, enemySpawnTimeSeconds: 2 },
  },
  {
    id: 'fixture_5',
    playerId: 'npc_kidd',
    playerName: 'Captain Kidd',
    createdAt: '2026-03-05T11:20:00.000Z',
    score: 7,
    durationSeconds: 120,
    endReason: 'timeout',
    config: { sessionTimeSeconds: 120, enemySpawnTimeSeconds: 4 },
  },
]

function readConfirmedMatches(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.confirmedMatches)
    if (!raw) {
      return []
    }

    return JSON.parse(raw) as MatchRecord[]
  } catch {
    return []
  }
}

function writeConfirmedMatches(matches: MatchRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.confirmedMatches, JSON.stringify(matches))
}

export function getAllMatches(): MatchRecord[] {
  return [...FIXTURE_MATCHES, ...readConfirmedMatches()]
}

export function findMatchById(id: string): MatchRecord | undefined {
  return getAllMatches().find((match) => match.id === id)
}

export function saveConfirmedMatch(match: MatchRecord): MatchRecord {
  const current = readConfirmedMatches()
  const alreadySaved = current.find((item) => item.id === match.id)

  if (alreadySaved) {
    return alreadySaved
  }

  const next = [...current, match]
  writeConfirmedMatches(next)
  return match
}

export function resetMockData(): void {
  localStorage.removeItem(STORAGE_KEYS.confirmedMatches)
  localStorage.removeItem(STORAGE_KEYS.pendingMatch)
  localStorage.removeItem(STORAGE_KEYS.lastResult)
}

export function getFixtureMatches(): MatchRecord[] {
  return [...FIXTURE_MATCHES]
}
