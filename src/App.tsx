import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { logout } from './authService'
import { getOrCreateCodename } from './codenameService'
import { allGuessed, MAX_PLAYERS, MIN_PLAYERS, TOTAL_ROUNDS, ranking, winners } from './gameController'
import {
  createSession, finishRound, joinSession, leaveSession, resetSession,
  showFinalResults, startNextRound, subscribeSession,
} from './gameSessionService'
import LoginForm from './LoginForm'
import QuizForm from './QuizForm'
import RoundResult from './RoundResult'
import type { Player, Session } from './types'
import './App.css'

const SESSION_KEY = 'hintavisa:session'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) ?? '')
  const [session, setSession] = useState<Session | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true) }), [])

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
    else localStorage.removeItem(SESSION_KEY)
  }, [sessionId])

  // Reaaliaikainen pelitila kaikille pelaajille.
  useEffect(() => {
    if (!user || !sessionId) { setSession(null); return }
    return subscribeSession(
      sessionId,
      (s) => {
        // Peli poistettu tai pelaaja ei (enää) mukana -> takaisin aulaan.
        if (!s || !s.players[user.uid]) { setSessionId(''); setSession(null); return }
        setSession(s)
      },
      (e) => setError(`Yhteysvirhe: ${e.message}`),
    )
  }, [user, sessionId])

  const isHost = !!user && session?.hostUid === user.uid

  // Host päättää kierroksen automaattisesti, kun kaikki ovat arvanneet.
  useEffect(() => {
    if (isHost && session?.status === 'playing' && allGuessed(session)) {
      finishRound(session.id, session.round).catch((e: Error) => setError(e.message))
    }
  }, [isHost, session])

  async function run(action: () => Promise<unknown>) {
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Toiminto epäonnistui.')
    }
  }

  if (!authReady) return <main><p>Ladataan…</p></main>

  const me: Player | null = user ? { uid: user.uid, name: getOrCreateCodename(user.uid), score: 0 } : null

  return (
    <main>
      <header>
        <h1>Hintavisa</h1>
        {user && me && (
          <p>
            {me.name} ({user.email}){' '}
            <button className="link" onClick={() => run(async () => { setSessionId(''); await logout() })}>Kirjaudu ulos</button>
          </p>
        )}
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {!user || !me ? (
        <LoginForm />
      ) : !sessionId ? (
        <section className="card">
          <h2>Aloita tai liity peliin</h2>
          <button onClick={() => run(async () => setSessionId(await createSession(me)))}>Luo uusi peli</button>
          <form onSubmit={(e) => {
            e.preventDefault()
            const code = joinCode.trim().toUpperCase()
            run(async () => { await joinSession(code, me); setSessionId(code) })
          }}>
            <label htmlFor="code">Pelikoodi</label>
            <div className="row">
              <input id="code" required maxLength={5} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
              <button type="submit">Liity</button>
            </div>
          </form>
        </section>
      ) : !session ? (
        <p>Ladataan peliä…</p>
      ) : session.status === 'waiting' ? (
        <section className="card">
          <h2>Odotetaan pelaajia</h2>
          <p>Pelikoodi: <strong className="code">{session.id}</strong> – kerro se kavereille.</p>
          <p>Pelaajat ({Object.keys(session.players).length}/{MAX_PLAYERS}):</p>
          <ul>
            {Object.values(session.players).map((p) => (
              <li key={p.uid}>{p.name}{p.uid === session.hostUid && ' (pelin luoja)'}</li>
            ))}
          </ul>
          {isHost ? (
            <button disabled={Object.keys(session.players).length < MIN_PLAYERS} onClick={() => run(() => startNextRound(session.id))}>
              Aloita peli ({TOTAL_ROUNDS} kierrosta)
            </button>
          ) : (
            <p className="muted">Odotetaan, että pelin luoja aloittaa pelin…</p>
          )}
          {isHost && Object.keys(session.players).length < MIN_PLAYERS && <p className="muted">Tarvitaan vähintään {MIN_PLAYERS} pelaajaa.</p>}
          <button className="secondary" onClick={() => run(async () => { await leaveSession(session.id, user.uid); setSessionId('') })}>
            Poistu
          </button>
        </section>
      ) : session.status === 'playing' ? (
        <QuizForm key={session.round} session={session} uid={user.uid} isHost={isHost}
          onForceFinish={() => run(() => finishRound(session.id, session.round, true))} />
      ) : session.status === 'roundResult' ? (
        <RoundResult session={session} isHost={isHost}
          onNext={() => run(() => session.round >= TOTAL_ROUNDS ? showFinalResults(session.id) : startNextRound(session.id))} />
      ) : (
        <section className="card">
          <h2>Peli päättyi!</h2>
          <p className="winner">
            🏆 {winners(session.players).length > 1 ? 'Tasapeli: ' : 'Voittaja: '}
            {winners(session.players).map((p) => p.name).join(', ')}
          </p>
          <ol>
            {ranking(session.players).map((p) => <li key={p.uid}>{p.name}: {p.score} pistettä</li>)}
          </ol>
          <h3>Kierrokset</h3>
          <ul>
            {session.rounds.map((r) => (
              <li key={r.round}>
                {r.round}. {r.product.title} ({r.product.price} $) – paras: {r.results[0]?.name ?? '-'}
              </li>
            ))}
          </ul>
          <div className="row">
            {isHost && <button onClick={() => run(() => resetSession(session.id))}>Uusi peli samoilla pelaajilla</button>}
            <button className="secondary" onClick={() => setSessionId('')}>Takaisin aulaan</button>
          </div>
        </section>
      )}
    </main>
  )
}
