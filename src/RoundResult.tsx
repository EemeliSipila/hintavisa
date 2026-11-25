import { ranking, TOTAL_ROUNDS } from './gameController'
import type { Session } from './types'

interface Props {
  session: Session
  isHost: boolean
  onNext: () => void
}

export default function RoundResult({ session, isHost, onNext }: Props) {
  const record = session.rounds.find((r) => r.round === session.round)
  if (!record) return <p>Lasketaan tuloksia…</p>
  const last = session.round >= TOTAL_ROUNDS

  return (
    <section className="card">
      <h2>Kierroksen {record.round} tulos</h2>
      <p>{record.product.title}: oikea hinta oli <strong>{record.product.price} $</strong></p>
      <table>
        <thead><tr><th>Pelaaja</th><th>Arvaus</th><th>Pisteet</th></tr></thead>
        <tbody>
          {record.results.map((r) => (
            <tr key={r.uid}><td>{r.name}</td><td>{r.guess} $</td><td>{r.points}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>Kokonaispisteet</h3>
      <ol>
        {ranking(session.players).map((p) => <li key={p.uid}>{p.name}: {p.score}</li>)}
      </ol>
      {isHost ? (
        <button onClick={onNext}>{last ? 'Näytä lopputulokset' : 'Seuraava kierros'}</button>
      ) : (
        <p className="muted">Odotetaan, että pelin luoja jatkaa…</p>
      )}
    </section>
  )
}
