import { describe, expect, it } from 'vitest';
import { runCommand } from '../../../src/system/command.js';

describe('runCommand', () => {
  it('returns standard output', async () => {
    const output = await runCommand(process.execPath, ['-e', 'process.stdout.write("hello")']);

    expect(output).toBe('hello');
  });

  it('rejects when the command fails', async () => {
    await expect(runCommand(process.execPath, ['-e', 'process.exit(3)'])).rejects.toThrow();
  });
});
