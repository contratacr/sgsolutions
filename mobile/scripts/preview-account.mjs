import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {randomBytes, scryptSync} from 'node:crypto';

// Separate from the user's local admin account and from every real account.
export async function preparePreviewAccount() {
  const folder = new URL('../../.privado/mobile-preview/', import.meta.url);
  await mkdir(folder, {recursive: true, mode: 0o700});
  try {
    await readFile(new URL('cuenta.json', folder));
    await readFile(new URL('qa-login.json', folder));
    return;
  } catch (error) {if (error.code !== 'ENOENT') throw error;}
  const correo = 'mobile-qa@example.invalid', clave = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
  await writeFile(new URL('cuenta.json', folder), JSON.stringify({correo, salt, hash: scryptSync(clave, salt, 64).toString('hex'), intentos: 0, bloqueadoHasta: 0, sesiones: []}), {mode: 0o600});
  await writeFile(new URL('qa-login.json', folder), JSON.stringify({correo, clave}), {mode: 0o600});
}
