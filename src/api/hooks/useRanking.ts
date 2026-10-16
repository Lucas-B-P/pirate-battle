import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchRanking, type RankingQuery } from '../rankingApi'

export function useRanking(query: RankingQuery) {
  return useQuery({
    queryKey: ['ranking', query],
    queryFn: () => fetchRanking(query),
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 10_000,
  })
}
