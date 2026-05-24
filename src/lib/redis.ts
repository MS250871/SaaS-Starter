import { Redis } from '@upstash/redis';
import { getDataLayerEnv } from '@/lib/env';

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = getDataLayerEnv();

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});
