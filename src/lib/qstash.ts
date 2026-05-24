import { Client, Receiver } from '@upstash/qstash';
import { getQStashEnv } from '@/lib/env';

const {
  QSTASH_URL,
  QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,
} = getQStashEnv();

export const qstash = new Client({
  baseUrl: QSTASH_URL,
  token: QSTASH_TOKEN,
});

const qstashReceiver = new Receiver({
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});

type VerifyQStashRequestSignatureOptions = {
  clockToleranceSeconds?: number;
};

export async function verifyQStashRequestSignature(
  request: Request,
  options?: VerifyQStashRequestSignatureOptions,
) {
  const signature = request.headers.get('upstash-signature');

  if (!signature) {
    return false;
  }

  const rawBody = await request.clone().text();

  try {
    return await qstashReceiver.verify({
      signature,
      body: rawBody,
      url: request.url,
      upstashRegion: request.headers.get('upstash-region') ?? undefined,
      clockTolerance: options?.clockToleranceSeconds ?? 5,
    });
  } catch {
    return false;
  }
}
