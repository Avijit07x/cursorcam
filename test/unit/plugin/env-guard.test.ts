import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, '..', '..', '..', 'plugin', 'hooks', 'env-guard.sh');
const BLOCKED_EXIT = 2;
const LARGE_COMMAND_LIMIT_MS = 2_000;
const hasShell = spawnSync('sh', ['-c', 'exit 0']).status === 0;

const BLOCKED = [
  'env',
  'printenv',
  'env | sort',
  'printenv | grep KEY',
  'set',
  'export',
  'export -p',
  'declare -p',
  'declare -x',
  'typeset',
  'ls; env',
  'cd app && env',
  'echo hi\nenv',
  'sudo env',
  'env -0',
  '(env)',
  'echo $(env)',
  'cat /proc/self/environ',
  'tr "\\0" "\\n" < /proc/1/environ',
  'node -e "console.log(process.env)"',
  'node -p "JSON.stringify(process.env, null, 2)"',
  'python3 -c "import os; print(os.environ)"',
];

const ALLOWED = [
  'printenv HOME',
  'env FOO=1 node app.js',
  'env -u CLAUDECODE claude -p hi',
  'export FOO=bar',
  'set -euo pipefail; make',
  'declare -p PATH',
  'declare -f',
  'npx env-cmd -f .env.test npm test',
  'cat .env.example',
  'echo $HOME',
  'node -e "console.log(process.env.HOME)"',
  'git commit -m "set env"',
  "CURSORCAM_SECRET_PASSWORD='x' npx -y cursorcam@1.0.0 run steps.json",
  'docker run --env FOO=1 image',
  'helm upgrade --set a=b chart',
  'grep -r environment src',
];

function runHook(command: string): { status: number | null; stderr: string } {
  const input = JSON.stringify({
    session_id: 'test',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command, description: 'Print env and set things' },
  });
  const result = spawnSync('sh', [SCRIPT], { input, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr };
}

describe.skipIf(!hasShell)('the env guard hook', () => {
  it.each(BLOCKED)('blocks %j', (command) => {
    const result = runHook(command);
    expect(result.status).toBe(BLOCKED_EXIT);
    expect(result.stderr).toContain('Print only the variable you need');
  });

  it.each(ALLOWED)('allows %j', (command) => {
    expect(runHook(command).status).toBe(0);
  });

  it('lets other tools and empty input through', () => {
    const result = spawnSync('sh', [SCRIPT], {
      input: JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/env' } }),
    });
    expect(result.status).toBe(0);
    expect(spawnSync('sh', [SCRIPT], { input: '' }).status).toBe(0);
  });

  it('stays fast on a very large command', () => {
    const command = `cat > notes.txt <<EOF\n${'x"y\\z '.repeat(30_000)}\nEOF`;
    const started = performance.now();
    expect(runHook(command).status).toBe(0);
    expect(performance.now() - started).toBeLessThan(LARGE_COMMAND_LIMIT_MS);
  });
});
