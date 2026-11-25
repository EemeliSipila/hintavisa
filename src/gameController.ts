// Pelin säännöt ilman Firestorea, jotta ne voi testata erikseen.
import type { GuessResult, Player, Product, Session } from './types'

export const TOTAL_ROUNDS = 3
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

export function calculatePoints(guess: number, price: number): number {
  const points = Math.max(0, 100 - Math.abs(guess - price))
  return Math.round(points * 100) / 100 // poistetaan liukulukujen 0.0000001-häntä
}

export function buildRoundResults(session: Session): GuessResult[] {
  const price = session.product?.price ?? 0
  return Object.values(session.players)
    .filter((p) => session.guesses[p.uid] !== undefined)
    .map((p) => {
      const guess = session.guesses[p.uid]
      return { uid: p.uid, name: p.name, guess, points: calculatePoints(guess, price) }
    })
    .sort((a, b) => b.points - a.points)
}

export function allGuessed(session: Session): boolean {
  return Object.keys(session.players).every((uid) => session.guesses[uid] !== undefined)
}

export function ranking(players: Record<string, Player>): Player[] {
  return Object.values(players).sort((a, b) => b.score - a.score)
}

// Tasapelissä voittajia voi olla useampi.
export function winners(players: Record<string, Player>): Player[] {
  const sorted = ranking(players)
  if (sorted.length === 0) return []
  return sorted.filter((p) => p.score === sorted[0].score)
}

function parseProduct(raw: unknown): Product | null {
  const p = raw as Record<string, unknown>
  if (typeof p?.id !== 'number' || typeof p.title !== 'string' || typeof p.price !== 'number') return null
  return { id: p.id, title: p.title, price: p.price, thumbnail: typeof p.thumbnail === 'string' ? p.thumbnail : '' }
}

// Hakee satunnaisen tuotteen, joka ei ole ollut jo tässä pelissä.
export async function fetchRandomProduct(usedIds: number[]): Promise<Product> {
  const response = await fetch('https://dummyjson.com/products?limit=0&select=title,price,thumbnail')
  if (!response.ok) throw new Error('Tuotteiden haku epäonnistui.')
  const data = (await response.json()) as { products?: unknown[] }
  const products = (data.products ?? []).map(parseProduct).filter((p): p is Product => p !== null)
  const unused = products.filter((p) => !usedIds.includes(p.id))
  if (unused.length === 0) throw new Error('Tuotteita ei löytynyt.')
  return unused[Math.floor(Math.random() * unused.length)]
}
