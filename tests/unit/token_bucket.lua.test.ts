import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { beforeAll, afterAll, test, expect } from 'vitest';

const redis = new Redis(process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379');
const luaPath = path.join(__dirname, '../../scripts/token_bucket.lua');
const luaScript = fs.readFileSync(luaPath, 'utf8');
let sha: string;

beforeAll(async () => {
  sha = await redis.script('LOAD', luaScript) as string;
});

afterAll(async () => {
  await redis.quit();
});

test('token bucket allows and blocks correctly', async () => {
  const key = 'test:rate:org:1:/test';
  await redis.del(key);

  const capacity = 5;
  const refillRate = 1; // 1 token per second
  const now = Math.floor(Date.now() / 1000);

  // consume capacity tokens
  for (let i = 0; i < capacity; i++) {
    const res = await redis.evalsha(sha, 1, key, capacity, refillRate, now, 1);
    expect((res as any)[0]).toBe(1);
  }

  // next request should be blocked
  const blocked = await redis.evalsha(sha, 1, key, capacity, refillRate, now, 1);
  expect((blocked as any)[0]).toBe(0);

  // simulate time passing to refill 2 tokens
  const later = now + 2;
  const resAfter = await redis.evalsha(sha, 1, key, capacity, refillRate, later, 1);
  expect((resAfter as any)[0]).toBe(1);
});
