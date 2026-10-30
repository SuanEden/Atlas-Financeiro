import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const workspace = fileURLToPath(new URL('../..', import.meta.url));
const originalNames = ['00_COMECE_AQUI.md', 'PROMPT_CODEX.md', 'REQUISITOS_ATLAS.md', 'REFERENCIAS_E_DECISOES.md'];
const snapshot = join(workspace, '.private/originais/2026-10-24-incremento-1');
const hasPrivateReference = existsSync(join(snapshot, 'manifest.json'));

describe('preservação dos documentos privados', () => {
  it.skipIf(!hasPrivateReference)('mantém originais e cópias iguais ao manifesto inicial', () => {
    const manifest = JSON.parse(readFileSync(join(snapshot, 'manifest.json'), 'utf8').replace(/^\uFEFF/, '')) as {
      files: { file: string; sha256: string; bytes: number }[];
    };
    expect(manifest.files.map((entry) => entry.file).sort()).toEqual([...originalNames].sort());
    for (const entry of manifest.files) {
      for (const location of [join(workspace, entry.file), join(snapshot, entry.file)]) {
        const bytes = readFileSync(location);
        expect(bytes.length).toBe(entry.bytes);
        expect(createHash('sha256').update(bytes).digest('hex').toUpperCase()).toBe(entry.sha256);
      }
    }
  });

  it('ignora os originais, arquivos secretos e cópias no Git', () => {
    const paths = [...originalNames, '.private/prova.json', 'app/.env', 'app/.env.production', 'backups/prova.json', 'anexos/prova.pdf'];
    const ignored = execFileSync('git', ['check-ignore', '--', ...paths], { cwd: workspace, encoding: 'utf8' }).trim().split(/\r?\n/);
    expect(ignored.sort()).toEqual(paths.sort());
    const tracked = execFileSync('git', ['ls-files'], { cwd: workspace, encoding: 'utf8' }).split(/\r?\n/);
    expect(tracked.some((path) => originalNames.includes(path) || path.startsWith('.private/'))).toBe(false);
  });

  it('mantém a pasta pública limitada a ativos sanitizados', () => {
    const appEntries = readdirSync(join(workspace, 'app'));
    expect(appEntries.some((name) => originalNames.includes(name) || name === '.private')).toBe(false);
    const publicEntries = readdirSync(join(workspace, 'app/public'), { recursive: true, encoding: 'utf8' });
    expect(publicEntries.length).toBeGreaterThan(0);
    expect(publicEntries.some((name) => originalNames.includes(name) || /(?:^|[\\/])(?:\.private|\.env|\.git)(?:[\\/]|$)/i.test(name))).toBe(false);
  });
});
