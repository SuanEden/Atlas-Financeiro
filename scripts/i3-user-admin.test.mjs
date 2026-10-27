import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { prepareUser } from './i3-user-admin.mjs'

const config = { projectRef: 'abcdefghijklmnopqrst', email: ' user@example.test ' }
const user = { id: 'synthetic-id', email: 'user@example.test', is_anonymous: false,
  email_confirmed_at: '2026-01-01T00:00:00Z', identities: [{ provider: 'email' }] }
function fixture() {
  const calls = []
  const state = { users: [], settings: { disable_signup: true,
    external: { email: false, google: false, anonymous_users: false, phone: false } } }
  const io = {
    settings: async () => state.settings,
    list: async () => state.users,
    begin: async intent => { calls.push(['begin', intent]) },
    create: async payload => { calls.push(['create', payload]); state.users = [user]; return user },
    get: async () => user,
    receipt: async receipt => { calls.push(['receipt', receipt]) },
  }
  return { io, state, calls }
}
test('default preview never records intent, creates a user or writes a receipt', async () => {
  const f = fixture()
  assert.deepEqual(await prepareUser(config, f.io), { status: 'PREVIA_OK_SEM_CRIACAO' })
  assert.deepEqual(f.calls, [])
})
test('one confirmed user, no password/invitation; intent precedes creation and private receipt follows verification', async () => {
  const f = fixture()
  const output = await prepareUser({ ...config, create: true }, f.io)
  assert.deepEqual(f.calls.map(c => c[0]), ['begin', 'create', 'receipt'])
  assert.deepEqual(f.calls[1][1], { email: 'user@example.test', email_confirm: true })
  assert.equal(f.calls[2][1].userId, user.id)
  assert.equal(output.status, 'USUARIO_CRIADO_E_CONFERIDO')
  assert.doesNotMatch(JSON.stringify(output), /user@example|synthetic-id/)
})
test('nonempty inventory and repeated execution cannot create another user', async () => {
  const f = fixture()
  await prepareUser({ ...config, create: true }, f.io)
  await assert.rejects(prepareUser({ ...config, create: true }, f.io), /Lista nao vazia/)
  assert.equal(f.calls.filter(c => c[0] === 'create').length, 1)
})
test('open, incomplete, or newly enabled auth settings stop before any write', async () => {
  for (const change of [s => { s.disable_signup = false }, s => { s.external.email = true },
    s => { delete s.external.google }, s => { s.external.extra = true }]) {
    const f = fixture(); change(f.state.settings)
    await assert.rejects(prepareUser({ ...config, create: true }, f.io), /precisam permanecer fechados/)
    assert.deepEqual(f.calls, [])
  }
})
test('invalid target, identity and mode stop without reads or writes', async () => {
  for (const bad of [{ projectRef: 'https://other.invalid' }, { email: '' }, { create: 'true' }]) {
    const f = fixture()
    await assert.rejects(prepareUser({ ...config, ...bad }, f.io))
    assert.deepEqual(f.calls, [])
  }
})
test('initial read failure and exclusive marker failure prevent create', async () => {
  for (const method of ['settings', 'list', 'begin']) {
    const f = fixture(); f.io[method] = async () => { throw new Error('PRIVATE_INPUT') }
    await assert.rejects(prepareUser({ ...config, create: true }, f.io), error =>
      !error.message.includes('PRIVATE_INPUT') && error.message.includes('nenhuma criacao iniciada'))
    assert.equal(f.calls.filter(c => c[0] === 'create').length, 0)
  }
})
test('uncertain create never retries, reports private errors or removes intent', async () => {
  const f = fixture(); let attempts = 0
  f.io.create = async () => { attempts++; throw new Error('PRIVATE_INPUT') }
  await assert.rejects(prepareUser({ ...config, create: true }, f.io), error =>
    !error.message.includes('PRIVATE_INPUT') && error.message.includes('Nao repetir'))
  assert.equal(attempts, 1)
  assert.deepEqual(f.calls.map(c => c[0]), ['begin'])
})
test('identity/confirmation mismatch or private receipt failure requires review after create', async () => {
  for (const change of [f => { f.io.get = async () => ({ ...user, email: 'other@example.test' }) },
    f => { f.io.get = async () => ({ ...user, email_confirmed_at: null }) },
    f => { f.io.get = async () => ({ ...user, identities: [{ provider: 'google' }] }) },
    f => { f.io.receipt = async () => { throw new Error('PRIVATE_INPUT') } }]) {
    const f = fixture(); change(f)
    await assert.rejects(prepareUser({ ...config, create: true }, f.io), /Nao repetir/)
    assert.equal(f.calls.filter(c => c[0] === 'create').length, 1)
  }
})
test('real CLI rejects invalid credentials locally without printing private input', () => {
  const input = { ...config, create: true, secret: 'INVALID_PRIVATE_VALUE' }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./i3-user-admin.mjs', import.meta.url))], {
    input: JSON.stringify(input), encoding: 'utf8', timeout: 5000,
  })
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /user@example|INVALID_PRIVATE_VALUE/)
  assert.match(result.stderr, /chave secreta invalida/)
})
