import { useState, type FormEvent } from 'react'
import { submitGuess } from './gameSessionService'
import type { Session } from './types'

interface Props {
  session: Session
  uid: string
  isHost: boolean
  onForceFinish: () => void
}

export default function QuizForm({ session, uid, isHost, onForceFinish }: Props) {
  const [guess, setGuess] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const product = session.product
  const myGuess = session.guesses[uid]
  const players = Object.values(session.players)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await submitGuess(session.id, uid, session.round, Number(guess.replace(',', '.')))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Arvauksen lähetys epäonnistui.')
    } finally {
      setPending(false)
    }
  }

  if (!product) return <p>Ladataan tuotetta…</p>

  return (
    <section className="card">
      <h2>Kierros {session.round}</h2>
      {product.thumbnail && <img className="product" src={product.thumbnail} alt={product.title} />}
      <h3>{product.title}</h3>

      {myGuess === undefined ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor="guess">Arvaa hinta ($)</label>
          <input id="guess" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" value={guess} onChange={(e) => setGuess(e.target.value)} />
          <button type="submit" disabled={pending}>Lähetä arvaus</button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      ) : (
        <p>Arvauksesi: <strong>{myGuess} $</strong>. Odotetaan muita pelaajia…</p>
      )}

      <ul>
        {players.map((p) => (
          <li key={p.uid}>{p.name}: {session.guesses[p.uid] !== undefined ? '✔ arvannut' : 'miettii…'}</li>
        ))}
      </ul>
      {isHost && <button className="secondary" onClick={onForceFinish}>Päätä kierros nyt</button>}
    </section>
  )
}
