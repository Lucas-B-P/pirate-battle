import { STORAGE_KEYS } from '../storage/storageKeys'

export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'error'
  | 'client-error'
  | 'offline'
  | 'out-of-order'
  | 'timeout-on-register'

export const NETWORK_SCENARIOS: { id: NetworkScenario; label: string }[] = [
  { id: 'success', label: 'Success' },
  { id: 'empty', label: 'Empty lists' },
  { id: 'slow', label: 'Slow / variable latency' },
  { id: 'error', label: 'API error (5xx)' },
  { id: 'client-error', label: 'Client error (4xx)' },
  { id: 'offline', label: 'Connection failure' },
  { id: 'out-of-order', label: 'Out-of-order responses' },
  { id: 'timeout-on-register', label: 'Timeout on register' },
]

const SCENARIO_IDS = new Set(NETWORK_SCENARIOS.map((item) => item.id))

export function loadNetworkScenario(): NetworkScenario {
  const value = localStorage.getItem(STORAGE_KEYS.networkScenario)
  if (value && SCENARIO_IDS.has(value as NetworkScenario)) {
    return value as NetworkScenario
  }

  return 'success'
}

export function saveNetworkScenario(scenario: NetworkScenario): void {
  localStorage.setItem(STORAGE_KEYS.networkScenario, scenario)
}
