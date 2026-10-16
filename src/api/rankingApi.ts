import type { MatchRecord, PaginatedResponse } from '../types/match'
import { apiClient } from './client'

export type RankingQuery = {
  page: number
  pageSize?: number
  sessionTimeSeconds?: number
  enemySpawnTimeSeconds?: number
}

export async function fetchRanking(
  query: RankingQuery,
): Promise<PaginatedResponse<MatchRecord>> {
  const response = await apiClient.get<PaginatedResponse<MatchRecord>>('/ranking', {
    params: {
      page: query.page,
      pageSize: query.pageSize ?? 5,
      sessionTimeSeconds: query.sessionTimeSeconds,
      enemySpawnTimeSeconds: query.enemySpawnTimeSeconds,
    },
  })

  return response.data
}
