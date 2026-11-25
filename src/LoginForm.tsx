import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { loginWithEmail, registerWithEmail } from './authService'

function readableError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Tarkista sähköpostiosoitteen muoto.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Sähköposti tai salasana on virheellinen.'
      case 'auth/email-already-in-use':
        return 'Sähköpostilla on jo tunnus. Kirjaudu sisään.'
      case 'auth/weak-password':
        return 'Salasanan pitää olla vähintään 6 merkkiä.'
      case 'auth/too-many-requests':
        return 'Liian monta yritystä. Yritä myöhemmin uudelleen.'
      case 'auth/network-request-failed':
        return 'Verkkoyhteys epäonnistui.'
      default:
        return `Kirjautuminen epäonnistui (${error.code}).`
    }
  }
  return error instanceof Error ? error.message : 'Kirjautuminen epäonnistui.'
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function run(action: typeof loginWithEmail) {
    setError('')
    setPending(true)
    try {
      await action(email, password) // App:n onAuthStateChanged vaihtaa näkymän
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run(loginWithEmail)
  }

  return (
    <section className="card">
      <h2>Kirjaudu sisään</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Sähköposti</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Salasana</label>
        <input id="password" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={pending}>Kirjaudu</button>
          <button type="button" className="secondary" disabled={pending || !email || password.length < 6} onClick={() => run(registerWithEmail)}>
            Luo uusi tunnus
          </button>
        </div>
      </form>
    </section>
  )
}
