import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchMatchHistory } from '../historyApi'

export function useMatchHistory(playerId: string, page: number) {
  return useQuery({
    queryKey: ['history', playerId, page],
    queryFn: () => fetchMatchHistory(playerId, page),
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 10_000,
  })
}
