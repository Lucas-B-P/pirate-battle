import type { MatchRecord, PaginatedResponse } from '../types/match'
import { apiClient } from './client'

export async function fetchMatchHistory(
  playerId: string,
  page: number,
  pageSize = 5,
): Promise<PaginatedResponse<MatchRecord>> {
  const response = await apiClient.get<PaginatedResponse<MatchRecord>>(
    `/history/${playerId}`,
    {
      params: { page, pageSize },
    },
  )

  return response.data
}

export async function registerMatch(match: MatchRecord): Promise<MatchRecord> {
  const response = await apiClient.post<MatchRecord>('/history', match)
  return response.data
}
