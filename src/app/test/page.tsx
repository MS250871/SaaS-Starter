import { printGridFromGoogleDoc } from '@/lib/decipher';

export default async function TestPage() {
  // Example usage:
  const decipheredCode = await printGridFromGoogleDoc(
    'https://docs.google.com/document/d/e/2PACX-1vSvM5gDlNvt7npYHhp_XfsJvuntUhq184By5xO_pA4b_gCWeXb6dM6ZxwN8rE6S4ghUsCj2VKR21oEP/pub',
  );
  return (
    <div>
      <h1>Deciphered Code:</h1>
      <pre>{decipheredCode || ''}</pre>
    </div>
  );
}
