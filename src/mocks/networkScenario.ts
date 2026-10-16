import { STORAGE_KEYS } from '../storage/storageKeys'

export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'error'
  | 'timeout-on-register'

export const NETWORK_SCENARIOS: { id: NetworkScenario; label: string }[] = [
  { id: 'success', label: 'Success' },
  { id: 'empty', label: 'Empty lists' },
  { id: 'slow', label: 'Slow network' },
  { id: 'error', label: 'API error' },
  { id: 'timeout-on-register', label: 'Timeout on register' },
]

export function loadNetworkScenario(): NetworkScenario {
  const value = localStorage.getItem(STORAGE_KEYS.networkScenario)
  if (
    value === 'success' ||
    value === 'empty' ||
    value === 'slow' ||
    value === 'error' ||
    value === 'timeout-on-register'
  ) {
    return value
  }

  return 'success'
}

export function saveNetworkScenario(scenario: NetworkScenario): void {
  localStorage.setItem(STORAGE_KEYS.networkScenario, scenario)
}
