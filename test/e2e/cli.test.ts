import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { CheckResult } from '../../src/doctor/checks.js';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { browserAvailable, CLI_PATH, useTempCache } from './helpers.js';

function runCli(args: readonly string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { env, encoding: 'utf8' });
}

describe('cursorcam CLI', () => {
  const cache = useTempCache();

  it('prints help and exits cleanly', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('doctor');
  });

  it('exits with the bad-input code for an unknown command', () => {
    expect(runCli(['record-everything']).status).toBe(ExitCode.BadInput);
  });

  it.skipIf(!browserAvailable())('doctor passes on this machine', () => {
    const result = runCli(['doctor', '--json'], cache.env());
    const checks = JSON.parse(result.stdout) as CheckResult[];

    expect(checks.map((check) => check.name)).toEqual(
      expect.arrayContaining(['Node.js', 'Browser', 'Capture', 'Encoder', 'Crash dumps', 'Disk']),
    );
    expect(checks.filter((check) => check.status === 'fail')).toEqual([]);
    expect(result.status).toBe(ExitCode.Ok);
  });
});
