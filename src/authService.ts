import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from './firebase'

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

// Moninpeliä varten pelaajat voivat luoda tunnuksen itse.
export async function registerWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email.trim(), password)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}
