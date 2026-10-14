import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// Every plugin, extension and marketplace file that names the package version.
const MANIFESTS = [
  join('plugin', '.claude-plugin', 'plugin.json'),
  join('agent-plugin', 'plugin.json'),
  join('agent-plugin', 'mcp.json'),
  join('agent-plugin', '.cursor-plugin', 'plugin.json'),
  join('agent-plugin', 'gemini-extension.json'),
  join('.cursor-plugin', 'marketplace.json'),
  join('.github', 'plugin', 'marketplace.json'),
  'gemini-extension.json',
];
// The Claude Code skill is the source; the open-standard plugin gets a copy.
const SKILL_SOURCE = join('plugin', 'skills', 'cursorcam');
const SKILL_COPY = join('agent-plugin', 'skills', 'cursorcam');
const CLAUDE_ONLY_FIELDS = /^(?:argument-hint|allowed-tools): .*\n/gm;
const PINNED_PACKAGE = /cursorcam@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g;
const MANIFEST_VERSION = /("version"\s*:\s*")[^"]*(")/;

const { values } = parseArgs({
  options: { check: { type: 'boolean', default: false }, root: { type: 'string' } },
});
const root = resolve(values.root ?? join(import.meta.dirname, '..'));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const readText = (file) => readFile(file, 'utf8').catch(() => undefined);

async function markdownFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}

function synced(file, text) {
  const pinned = text.replaceAll(PINNED_PACKAGE, `cursorcam@${version}`);
  return file.endsWith('.json') ? pinned.replace(MANIFEST_VERSION, `$1${version}$2`) : pinned;
}

// Each change is a file and the text it should have; undefined text means delete it.
async function plannedChanges() {
  const changes = [];
  for (const name of MANIFESTS) {
    const file = join(root, name);
    const text = await readText(file);
    if (text !== undefined) changes.push({ file, current: text, next: synced(file, text) });
  }
  const sources = await markdownFiles(join(root, SKILL_SOURCE));
  for (const name of sources) {
    const file = join(root, SKILL_SOURCE, name);
    const text = await readFile(file, 'utf8');
    const next = synced(file, text);
    changes.push({ file, current: text, next });
    const copy = join(root, SKILL_COPY, name);
    changes.push({
      file: copy,
      current: await readText(copy),
      next: next.replace(CLAUDE_ONLY_FIELDS, ''),
    });
  }
  for (const name of await markdownFiles(join(root, SKILL_COPY))) {
    if (sources.includes(name)) continue;
    const file = join(root, SKILL_COPY, name);
    changes.push({ file, current: await readText(file), next: undefined });
  }
  return changes.filter((change) => change.current !== change.next);
}

const stale = await plannedChanges();
if (!values.check) {
  for (const { file, next } of stale) {
    if (next === undefined) {
      await rm(file);
      continue;
    }
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, next);
  }
}

const names = stale.map(({ file }) => relative(root, file)).join(', ');
if (values.check && stale.length > 0) {
  console.error(`These files do not match version ${version}: ${names}`);
  console.error('Run: pnpm sync-version');
  process.exit(1);
}
console.log(
  stale.length > 0 && !values.check
    ? `Updated to ${version}: ${names}`
    : `The plugins match version ${version}.`,
);
