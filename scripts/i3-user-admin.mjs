// Administrative Node-only helper. Never import into the application bundle.
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export class AdminStop extends Error {}
function stop(message) { throw new AdminStop(message) }

export function validateAdminInput(config) {
  if (!config || typeof config !== 'object' || !/^[a-z]{20}$/.test(config.projectRef ?? '')) {
    stop('Identificador do projeto invalido; nenhuma requisicao iniciada.')
  }
  const secret = typeof config.secret === 'string' ? config.secret.trim() : ''
  if (secret.startsWith('sb_publishable_')) {
    stop('Chave publica recebida. Use Secret key (sb_secret), nao Publishable key; nenhuma requisicao iniciada.')
  }
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(secret)) return { ...config, secret }
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    let role
    try { role = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString('utf8')).role }
    catch { stop('Chave administrativa invalida; nenhuma requisicao iniciada.') }
    // Classification only. The project API must validate the signature and privileges.
    if (role === 'service_role') return { ...config, secret }
    stop('Chave sem papel administrativo. Use Secret key ou service_role; nenhuma requisicao iniciada.')
  }
  stop('Chave administrativa ausente ou formato nao reconhecido. Copie o valor pelo botao Copy; nenhuma requisicao iniciada.')
}

export async function prepareUser({ projectRef, email, create = false }, io) {
  if (!/^[a-z]{20}$/.test(projectRef ?? '') || typeof create !== 'boolean') {
    stop('Configuracao invalida; nenhuma criacao iniciada.')
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    stop('Email invalido; nenhuma criacao iniciada.')
  }
  let settings, before
  try {
    settings = await io.settings()
    before = await io.list()
  } catch {
    stop('Falha na leitura inicial; nenhuma criacao iniciada.')
  }
  if (settings?.disable_signup !== true || !settings.external ||
      !['email', 'google', 'anonymous_users', 'phone'].every(k => settings.external[k] === false) ||
      Object.values(settings.external).some(value => value !== false)) {
    stop('Cadastro e metodos de entrada precisam permanecer fechados; nenhuma criacao iniciada.')
  }
  if (!Array.isArray(before) || before.length !== 0) {
    stop('Lista nao vazia ou resposta invalida; revisar inventario antes de criar.')
  }
  if (!create) return { status: 'PREVIA_OK_SEM_CRIACAO' }

  // Persist an exclusive marker BEFORE the sole create attempt. Keep it on error.
  try { await io.begin({ projectRef, email: normalizedEmail }) }
  catch { stop('Nao foi possivel registrar tentativa exclusiva; nenhuma criacao iniciada.') }
  try {
    const user = await io.create({ email: normalizedEmail, email_confirm: true })
    const after = await io.list()
    const verified = user?.id ? await io.get(user.id) : null
    if (!Array.isArray(after) || after.length !== 1 || after[0]?.id !== user?.id ||
        !verified?.id || verified.id !== user.id || verified.email?.toLowerCase() !== normalizedEmail ||
        !verified.email_confirmed_at || verified.is_anonymous !== false ||
        (verified.identities ?? []).some(identity => identity.provider !== 'email')) {
      throw new Error('Verification failed')
    }
    await io.receipt({ projectRef, email: normalizedEmail, userId: verified.id,
      emailConfirmed: true, verifiedAt: new Date().toISOString() })
    return { status: 'USUARIO_CRIADO_E_CONFERIDO', privateReceipt: '.private/i3-admin/usuario.json' }
  } catch {
    stop('Tentativa iniciada: resultado exige conferencia. Nao repetir nem apagar a tentativa; pode haver usuario criado.')
  }
}

async function main() {
  let input = ''
  for await (const part of process.stdin) {
    input += part
    if (input.length > 8192) stop('Entrada invalida.')
  }
  const config = validateAdminInput(JSON.parse(input))
  input = ''
  const url = `https://${config.projectRef}.supabase.co`
  const require = createRequire(resolve(root, 'app/package.json'))
  const { createClient } = require('@supabase/supabase-js')
  const client = createClient(url, config.secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (address, options) => fetch(address, {
      ...options, signal: AbortSignal.timeout(20000), redirect: 'error',
    }) },
  })
  const privateDir = resolve(root, '.private/i3-admin')
  const checked = async request => {
    const result = await request
    if (result.error) throw new Error('Administrative request failed')
    return result.data
  }
  const output = await prepareUser(config, {
    settings: async () => {
      const response = await fetch(`${url}/auth/v1/settings?check=${crypto.randomUUID()}`, {
        headers: { apikey: config.secret, 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(20000), redirect: 'error',
      })
      if (!response.ok) throw new Error('Settings read failed')
      return response.json()
    },
    list: async () => (await checked(client.auth.admin.listUsers({ page: 1, perPage: 2 }))).users,
    get: async id => (await checked(client.auth.admin.getUserById(id))).user,
    create: async attributes => (await checked(client.auth.admin.createUser(attributes))).user,
    begin: async intent => {
      await mkdir(privateDir, { recursive: true })
      await writeFile(resolve(privateDir, 'tentativa.json'), JSON.stringify({
        ...intent, startedAt: new Date().toISOString(),
      }), { flag: 'wx', mode: 0o600 })
    },
    receipt: receipt => writeFile(resolve(privateDir, 'usuario.json'),
      JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 }),
  })
  config.secret = ''
  process.stdout.write(`${JSON.stringify(output)}\n`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    // Never print raw SDK/HTTP/input errors, which can contain private values.
    process.stderr.write(`${error instanceof AdminStop ? error.message : 'Falha local; revisar procedimento sem compartilhar credenciais.'}\n`)
    process.exitCode = 1
  })
}
