import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkLoginName,
  findSavedLogin,
  forgetLogin,
  listSavedLogins,
  saveLogin,
  savedLoginFile,
} from '../../../src/login/saved.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { resolvePaths } from '../../../src/system/paths.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const STATE = { cookies: [{ name: 'session', value: 'abc' }], origins: [] };

describe('saved logins', () => {
  const dir = useTempDir();
  const paths = () => resolvePaths({ CURSORCAM_CACHE_DIR: dir.path() });

  it('accepts simple names and refuses paths', () => {
    expect(checkLoginName('acme-admin_2')).toBe('acme-admin_2');
    for (const name of ['../x', 'a/b', '', '-x', 'a'.repeat(41), 'with space']) {
      expect(() => checkLoginName(name)).toThrow(
        expect.objectContaining({ exitCode: ExitCode.BadInput }),
      );
    }
  });

  it('saves a login readable only by the user, and lists it', async () => {
    const file = await saveLogin(paths(), 'acme', STATE);

    expect(file).toBe(savedLoginFile(paths(), 'acme'));
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(STATE);
    if (process.platform !== 'win32') {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
      expect((await stat(paths().savedProfiles)).mode & 0o777).toBe(0o700);
    }
    await writeFile(join(paths().savedProfiles, 'notes.txt'), 'x');
    await saveLogin(paths(), 'beta', STATE);
    expect(await listSavedLogins(paths())).toEqual(['acme', 'beta']);
    expect(await findSavedLogin(paths(), 'beta')).toBe(savedLoginFile(paths(), 'beta'));
  });

  it('names the saved logins when one is missing', async () => {
    await expect(findSavedLogin(paths(), 'acme')).rejects.toMatchObject({
      exitCode: ExitCode.BadInput,
      hint: 'Save one first with: cursorcam login <url> --profile acme',
    });
    await saveLogin(paths(), 'beta', STATE);
    await expect(findSavedLogin(paths(), 'acme')).rejects.toMatchObject({
      message: 'There is no saved login named "acme".',
      hint: expect.stringContaining('Saved logins: beta.') as string,
    });
  });

  it('forgets a login', async () => {
    await saveLogin(paths(), 'acme', STATE);
    expect(await forgetLogin(paths(), 'acme')).toBe(true);
    expect(await forgetLogin(paths(), 'acme')).toBe(false);
    expect(await listSavedLogins(paths())).toEqual([]);
  });
});
