export interface Product {
  id: number
  title: string
  price: number
  thumbnail: string
}

export interface Player {
  uid: string
  name: string
  score: number
}

export interface GuessResult {
  uid: string
  name: string
  guess: number
  points: number
}

export interface RoundRecord {
  round: number
  product: Product
  results: GuessResult[]
}

// waiting = odotustila, playing = arvataan, roundResult = kierroksen tulos näkyy, finished = peli ohi
export type SessionStatus = 'waiting' | 'playing' | 'roundResult' | 'finished'

export interface Session {
  id: string
  hostUid: string
  status: SessionStatus
  round: number // 0 = peli ei ole alkanut
  product: Product | null
  guesses: Record<string, number> // uid -> arvaus, nollataan joka kierroksella
  players: Record<string, Player> // uid -> pelaaja
  rounds: RoundRecord[]
}
