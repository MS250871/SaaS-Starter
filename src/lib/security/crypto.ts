const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-key';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/* -------------------------------------------------------------------------- */
/*                              KEY GENERATION                                */
/* -------------------------------------------------------------------------- */

async function getKey() {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(AUTH_SECRET),
  );

  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/* -------------------------------------------------------------------------- */
/*                                 ENCRYPT                                    */
/* -------------------------------------------------------------------------- */

export async function encryptToken(payload: object): Promise<string> {
  const key = await getKey();

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV (recommended for GCM)

  const encoded = encoder.encode(JSON.stringify(payload));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded,
  );

  const ivBase64 = Buffer.from(iv).toString('base64');
  const encryptedBase64 = Buffer.from(ciphertext).toString('base64');

  return `${ivBase64}.${encryptedBase64}`;
}

/* -------------------------------------------------------------------------- */
/*                                 DECRYPT                                    */
/* -------------------------------------------------------------------------- */

export async function decryptToken<T>(token: string): Promise<T | null> {
  try {
    const [ivBase64, encryptedBase64] = token.split('.');
    if (!ivBase64 || !encryptedBase64) return null;

    const key = await getKey();

    const iv = new Uint8Array(Buffer.from(ivBase64, 'base64'));
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encrypted,
    );

    const json = decoder.decode(decrypted);

    return JSON.parse(json);
  } catch {
    return null;
  }
}
