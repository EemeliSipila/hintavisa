// Ajo: npm test
import assert from 'node:assert/strict'
import { allGuessed, buildRoundResults, calculatePoints, winners } from './gameController.ts'
import type { Session } from './types.ts'

assert.equal(calculatePoints(50, 50), 100)
assert.equal(calculatePoints(40, 50), 90)
assert.equal(calculatePoints(60, 50), 90)
assert.equal(calculatePoints(500, 50), 0)
assert.equal(calculatePoints(10, 9.99), 99.99)

const session: Session = {
  id: 'X', hostUid: 'a', status: 'playing', round: 1,
  product: { id: 1, title: 'T', price: 20, thumbnail: '' },
  guesses: { a: 25 },
  players: { a: { uid: 'a', name: 'A', score: 0 }, b: { uid: 'b', name: 'B', score: 0 } },
  rounds: [],
}
assert.equal(allGuessed(session), false)
session.guesses.b = 20
assert.equal(allGuessed(session), true)
assert.deepEqual(buildRoundResults(session).map((r) => [r.uid, r.points]), [['b', 100], ['a', 95]])

assert.deepEqual(winners({ a: { uid: 'a', name: 'A', score: 5 }, b: { uid: 'b', name: 'B', score: 5 } }).length, 2)
console.log('gameController: kaikki testit ok')
