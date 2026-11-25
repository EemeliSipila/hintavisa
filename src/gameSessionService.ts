// Kaikki Firestore-operaatiot. Pelitila on yhdessä dokumentissa sessions/{koodi}.
// Muutokset, jotka riippuvat nykyisestä tilasta, tehdään transaktioina, jotta
// samanaikaiset liittymiset/arvaukset/kierroksen päätökset eivät ylikirjoita toisiaan.
import { doc, getDoc, onSnapshot, runTransaction, type DocumentReference } from 'firebase/firestore'
import { db } from './firebase'
import { allGuessed, buildRoundResults, fetchRandomProduct, MAX_PLAYERS, MIN_PLAYERS, TOTAL_ROUNDS } from './gameController'
import type { Player, Session } from './types'

function sessionRef(id: string): DocumentReference {
  return doc(db, 'sessions', id)
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ei sekaannettavia merkkejä (O/0, I/1)
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Firestore-dokumentista Session-olioksi. Puuttuvat kentät saavat oletusarvon.
function toSession(id: string, data: Record<string, unknown>): Session {
  return {
    id,
    hostUid: data.hostUid as string,
    status: data.status as Session['status'],
    round: (data.round as number) ?? 0,
    product: (data.product as Session['product']) ?? null,
    guesses: (data.guesses as Session['guesses']) ?? {},
    players: (data.players as Session['players']) ?? {},
    rounds: (data.rounds as Session['rounds']) ?? [],
  }
}

export async function createSession(player: Player): Promise<string> {
  return runTransaction(db, async (tx) => {
    const id = randomCode()
    if ((await tx.get(sessionRef(id))).exists()) throw new Error('Koodi oli jo käytössä, yritä uudelleen.')
    const session: Omit<Session, 'id'> = {
      hostUid: player.uid,
      status: 'waiting',
      round: 0,
      product: null,
      guesses: {},
      players: { [player.uid]: player },
      rounds: [],
    }
    tx.set(sessionRef(id), session)
    return id
  })
}

export async function joinSession(id: string, player: Player): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(id))
    if (!snap.exists()) throw new Error('Peliä ei löytynyt tällä koodilla.')
    const session = toSession(id, snap.data())
    if (session.players[player.uid]) return // jo mukana, esim. sivun uudelleenlataus
    if (session.status !== 'waiting') throw new Error('Peli on jo alkanut.')
    if (Object.keys(session.players).length >= MAX_PLAYERS) throw new Error('Peli on täynnä.')
    tx.update(sessionRef(id), { [`players.${player.uid}`]: player })
  })
}

export async function leaveSession(id: string, uid: string): Promise<void> {
  // Vain odotustilassa poistetaan pelaajalistalta; kesken pelin pisteet jäävät näkyviin.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(id))
    if (!snap.exists()) return
    const session = toSession(id, snap.data())
    if (session.status !== 'waiting' || session.hostUid === uid || !session.players[uid]) return
    const players = { ...session.players }
    delete players[uid]
    tx.update(sessionRef(id), { players })
  })
}

export function subscribeSession(id: string, onChange: (s: Session | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    sessionRef(id),
    (snap) => onChange(snap.exists() ? toSession(snap.id, snap.data()) : null),
    onError,
  )
}

// Hostin toiminto: aloittaa ensimmäisen tai seuraavan kierroksen.
export async function startNextRound(id: string): Promise<void> {
  const ref = sessionRef(id)
  // Tuote haetaan ennen transaktiota, koska transaktio voidaan ajaa useamman kerran.
  const current = toSession(id, (await getDoc(ref)).data() ?? {})
  const product = await fetchRandomProduct(current.rounds.map((r) => r.product.id))

  await runTransaction(db, async (tx) => {
    const session = toSession(id, (await tx.get(ref)).data() ?? {})
    if (session.round !== current.round || session.status !== current.status) return // joku ehti ensin
    if (session.status === 'waiting' && Object.keys(session.players).length < MIN_PLAYERS) {
      throw new Error(`Peliin tarvitaan vähintään ${MIN_PLAYERS} pelaajaa.`)
    }
    if (session.status !== 'waiting' && session.status !== 'roundResult') return
    tx.update(ref, { status: 'playing', round: session.round + 1, product, guesses: {} })
  })
}

export async function submitGuess(id: string, uid: string, round: number, guess: number): Promise<void> {
  if (!Number.isFinite(guess) || guess < 0) throw new Error('Anna hinta positiivisena lukuna.')
  await runTransaction(db, async (tx) => {
    const session = toSession(id, (await tx.get(sessionRef(id))).data() ?? {})
    if (session.status !== 'playing' || session.round !== round) throw new Error('Kierros on jo päättynyt.')
    if (session.guesses[uid] !== undefined) return
    tx.update(sessionRef(id), { [`guesses.${uid}`]: guess })
  })
}

// Hostin toiminto: laskee pisteet ja tallentaa kierroksen tuloksen. Turvallista kutsua
// useasti, koska tila tarkistetaan transaktiossa (vain yksi kutsu päivittää).
export async function finishRound(id: string, round: number, force = false): Promise<void> {
  const ref = sessionRef(id)
  await runTransaction(db, async (tx) => {
    const session = toSession(id, (await tx.get(ref)).data() ?? {})
    if (session.status !== 'playing' || session.round !== round || !session.product) return
    if (!force && !allGuessed(session)) return

    const results = buildRoundResults(session)
    const players = { ...session.players }
    for (const r of results) players[r.uid] = { ...players[r.uid], score: Math.round((players[r.uid].score + r.points) * 100) / 100 }

    tx.update(ref, {
      status: 'roundResult',
      players,
      rounds: [...session.rounds, { round, product: session.product, results }],
    })
  })
}

export async function showFinalResults(id: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const session = toSession(id, (await tx.get(sessionRef(id))).data() ?? {})
    if (session.status === 'roundResult' && session.round >= TOTAL_ROUNDS) tx.update(sessionRef(id), { status: 'finished' })
  })
}

// Uusi peli samoilla pelaajilla: pisteet ja kierrokset nollataan.
export async function resetSession(id: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const session = toSession(id, (await tx.get(sessionRef(id))).data() ?? {})
    const players: Record<string, Player> = {}
    for (const p of Object.values(session.players)) players[p.uid] = { ...p, score: 0 }
    tx.update(sessionRef(id), { status: 'waiting', round: 0, product: null, guesses: {}, players, rounds: [] })
  })
}
