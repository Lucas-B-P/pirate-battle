import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MatchRecord } from '../../types/match'
import {
  removePendingMatch,
  savePendingMatch,
} from '../../storage/pendingMatchStorage'
import { registerMatch } from '../historyApi'

export function useRegisterMatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (match: MatchRecord) => {
      savePendingMatch(match)
      return registerMatch(match)
    },
    onSuccess: (saved) => {
      removePendingMatch(saved.id)
      void queryClient.invalidateQueries({ queryKey: ['ranking'] })
      void queryClient.invalidateQueries({ queryKey: ['history'] })
      return saved
    },
  })
}
