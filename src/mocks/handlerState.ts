let rankingRequestSerial = 0

export function nextRankingSerial(): number {
  rankingRequestSerial += 1
  return rankingRequestSerial
}

export function resetHandlerState(): void {
  rankingRequestSerial = 0
}
