import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = process.argv.indexOf('--root');
const root = index < 0 ? repo : path.resolve(process.argv[index + 1] || '');
const requirements = JSON.parse(await readFile(path.join(repo, 'ASSET-REQUIREMENTS.json'), 'utf8'));
const errors = [];
for (const file of requirements.files) {
  if (!file.path || file.path.includes('\\') || file.path.split('/').some(x => !x || x === '..' || x === '.') || path.posix.isAbsolute(file.path)) throw Error('Unsafe asset requirement');
  const absolute = path.resolve(root, file.path);
  if (!absolute.startsWith(root + path.sep)) throw Error('Asset path leaves root');
  try {
    const bytes = await readFile(absolute);
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) errors.push('Changed: ' + file.path);
  } catch { errors.push('Missing: ' + file.path); }
}
if (errors.length) throw Error('External assets are not included in this source snapshot. Supply the exact licensed files listed in ASSET-REQUIREMENTS.json before a visual build.\n' + errors.join('\n'));
console.log(`Verified ${requirements.files.length} external asset files. Integrity is not a redistribution or artwork-approval grant.`);
