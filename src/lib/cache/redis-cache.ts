import { redis } from '@/lib/redis';

type RedisCacheParser<T> = (raw: unknown) => T | null;

type RedisCacheWriteOptions = {
  ttlSeconds?: number;
};

type RememberRedisCacheOptions<T> = RedisCacheWriteOptions & {
  parser?: RedisCacheParser<T>;
  cacheNull?: boolean;
};

function normalizeKeys(keys: Array<string | null | undefined>) {
  return Array.from(new Set(keys.filter((value): value is string => Boolean(value))));
}

function isDynamicServerUsageError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const digest =
    'digest' in error && typeof error.digest === 'string' ? error.digest : null;
  const description =
    'description' in error && typeof error.description === 'string'
      ? error.description
      : null;
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : null;

  return (
    digest === 'DYNAMIC_SERVER_USAGE' ||
    description?.includes('Dynamic server usage') === true ||
    message?.includes('Dynamic server usage') === true
  );
}

export async function getRedisCache<T>(
  key: string,
  parser?: RedisCacheParser<T>,
): Promise<T | null> {
  try {
    const cached = await redis.get(key);

    if (cached === null || cached === undefined) {
      return null;
    }

    return parser ? parser(cached) : (cached as T);
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return null;
    }

    console.error(`REDIS CACHE READ FAILED (${key})`, error);
    return null;
  }
}

export async function setRedisCache<T>(
  key: string,
  value: T,
  options?: RedisCacheWriteOptions,
) {
  try {
    if (options?.ttlSeconds) {
      await redis.set(key, value, { ex: options.ttlSeconds });
      return;
    }

    await redis.set(key, value);
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return;
    }

    console.error(`REDIS CACHE WRITE FAILED (${key})`, error);
  }
}

export async function deleteRedisCache(...keys: Array<string | null | undefined>) {
  const normalizedKeys = normalizeKeys(keys);

  if (normalizedKeys.length === 0) {
    return;
  }

  try {
    await redis.del(...normalizedKeys);
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return;
    }

    console.error(`REDIS CACHE DELETE FAILED (${normalizedKeys.join(', ')})`, error);
  }
}

export async function rememberRedisCache<T>(
  key: string,
  loader: () => Promise<T>,
  options?: RememberRedisCacheOptions<T>,
): Promise<T> {
  const cached = await getRedisCache<T>(key, options?.parser);

  if (cached !== null) {
    return cached;
  }

  const value = await loader();

  if (value !== null || options?.cacheNull) {
    await setRedisCache(key, value, options);
  }

  return value;
}

export async function getRedisCacheVersion(key: string) {
  try {
    const cached = await redis.get<number | string | null>(key);

    if (typeof cached === 'number' && Number.isFinite(cached) && cached > 0) {
      return cached;
    }

    if (typeof cached === 'string') {
      const parsed = Number.parseInt(cached, 10);

      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return 1;
    }

    console.error(`REDIS CACHE VERSION READ FAILED (${key})`, error);
  }

  return 1;
}

export async function bumpRedisCacheVersion(key: string) {
  try {
    return await redis.incr(key);
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return null;
    }

    console.error(`REDIS CACHE VERSION BUMP FAILED (${key})`, error);
    return null;
  }
}
