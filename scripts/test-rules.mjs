/**
 * SPENDSTATE // FIRESTORE RULES TEST
 *
 * Runs against the Firestore emulator (see `pnpm test:rules`). Asserts the
 * owner-only contract: a user may touch their own subtree and nothing else, and
 * signed-out clients may touch nothing at all.
 */
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')

const env = await initializeTestEnvironment({
  projectId: 'demo-spendstate',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
})

const alice = env.authenticatedContext('alice').firestore()
const bob = env.authenticatedContext('bob').firestore()
const anon = env.unauthenticatedContext().firestore()

let passed = 0
const ok = async (label, promise) => {
  await assertSucceeds(promise)
  console.log(`  PASS  ${label}`)
  passed++
}
const denied = async (label, promise) => {
  await assertFails(promise)
  console.log(`  PASS  ${label}`)
  passed++
}

console.log('SPENDSTATE // firestore rules')

try {
  await ok('owner writes own document', setDoc(doc(alice, 'users/alice/subscriptions/s1'), { id: 's1', name: 'Netflix' }))
  await ok('owner reads own document', getDoc(doc(alice, 'users/alice/subscriptions/s1')))
  await ok('owner writes another own table', setDoc(doc(alice, 'users/alice/incomes/i1'), { id: 'i1', amount: 95000 }))

  await denied('other user cannot read', getDoc(doc(bob, 'users/alice/subscriptions/s1')))
  await denied('other user cannot write', setDoc(doc(bob, 'users/alice/subscriptions/s1'), { id: 's1', name: 'Tampered' }))
  await denied('owner cannot write into another subtree', setDoc(doc(alice, 'users/bob/spends/x'), { id: 'x' }))

  await denied('signed-out cannot read', getDoc(doc(anon, 'users/alice/subscriptions/s1')))
  await denied('signed-out cannot write', setDoc(doc(anon, 'users/alice/spends/s9'), { id: 's9' }))
  await denied('root collections are closed', setDoc(doc(alice, 'subscriptions/s1'), { id: 's1' }))

  console.log(`\n${passed} rules assertions passed`)
} finally {
  await env.cleanup()
}
