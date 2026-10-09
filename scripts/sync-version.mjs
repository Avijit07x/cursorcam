import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const PLUGIN_MANIFEST = join('plugin', '.claude-plugin', 'plugin.json');
const SKILL_DIR = join('plugin', 'skills', 'cursorcam');
const PINNED_PACKAGE = /cursorcam@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g;
const MANIFEST_VERSION = /("version"\s*:\s*")[^"]*(")/;

const { values } = parseArgs({
  options: { check: { type: 'boolean', default: false }, root: { type: 'string' } },
});
const root = resolve(values.root ?? join(import.meta.dirname, '..'));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

async function markdownFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name));
}

function synced(file, text) {
  return file.endsWith('.json')
    ? text.replace(MANIFEST_VERSION, `$1${version}$2`)
    : text.replaceAll(PINNED_PACKAGE, `cursorcam@${version}`);
}

const files = [join(root, PLUGIN_MANIFEST), ...(await markdownFiles(join(root, SKILL_DIR)))];
const stale = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const next = synced(file, text);
  if (next === text) continue;
  stale.push(relative(root, file));
  if (!values.check) await writeFile(file, next);
}

if (values.check && stale.length > 0) {
  console.error(`These files do not match version ${version}: ${stale.join(', ')}`);
  console.error('Run: pnpm sync-version');
  process.exit(1);
}
console.log(
  stale.length > 0 && !values.check
    ? `Updated to ${version}: ${stale.join(', ')}`
    : `The plugin matches version ${version}.`,
);
