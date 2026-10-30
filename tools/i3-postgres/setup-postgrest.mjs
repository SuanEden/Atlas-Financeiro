import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgres } from '@embedded-postgres/windows-x64';

// Official pinned release. Cached binaries/archives are ignored by Git.
export const version = '16.5';
export const cache = fileURLToPath(new URL('./node_modules/.cache/postgrest-v16.5/', import.meta.url));
export const binary = join(cache, 'postgrest.exe');
const archive = join(cache, 'postgrest.zip');
const sha256 = '17f595b0d8dd37473d0231417dea07c5ac9f791282ff5b017fae51ff29e5de2f';
const url = 'https://github.com/PostgREST/postgrest/releases/download/v16.5/postgrest-v16.5-windows-x86-64.zip';

export function localProcessEnvironment() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(?:path|systemroot|windir|comspec|temp|tmp|pathext)$/i.test(name)));
  const pathKey = Object.keys(env).find(name => name.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = dirname(postgres) + ';' + (env[pathKey] ?? '');
  return env;
}

export async function preparePostgrest() {
  if (process.platform !== 'win32') throw new Error('This validation tool requires Windows x64');
  await mkdir(cache, { recursive: true });
  let bytes;
  try { bytes = await readFile(archive); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error('Pinned official gateway download failed: HTTP ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 20_000_000) throw new Error('Unexpected gateway archive size');
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('Gateway archive checksum mismatch');
    await writeFile(archive, bytes, { flag: 'wx' });
  }
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('Cached gateway checksum mismatch');
  try { await stat(binary); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      '$ErrorActionPreference="Stop"\nExpand-Archive -LiteralPath $env:ATLAS_I3_PGRST_ARCHIVE -DestinationPath $env:ATLAS_I3_PGRST_EXTRACT'],
    { env: { ...localProcessEnvironment(), ATLAS_I3_PGRST_ARCHIVE: archive, ATLAS_I3_PGRST_EXTRACT: cache }, stdio: 'ignore', windowsHide: true, timeout: 30_000 });
  }
  const output = execFileSync(binary, ['--version'], { env: localProcessEnvironment(), windowsHide: true, encoding: 'utf8', timeout: 5000 });
  if (!output.includes(version)) throw new Error('Unexpected gateway version');
  return binary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await preparePostgrest();
  process.stdout.write('Pinned official PostgREST ' + version + ' prepared and checksum verified.\n');
}
