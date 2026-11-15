interface CardSpec {
  color?: string
  value?: number
  type?: string
}

interface TestSetupConfig {
  playerCount?: number
  activeColor?: string
  revealedCard?: CardSpec
  discardPile?: CardSpec[]
  players?: Array<{
    gauge?: number
    hand?: CardSpec[]
  }>
  currentPlayerIndex?: number
}

declare interface Window {
  __testSetup: (config: TestSetupConfig) => void
}
