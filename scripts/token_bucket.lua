-- token_bucket.lua
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = now (unix seconds, integer)
-- ARGV[4] = tokens_requested (integer)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- read stored tokens and last timestamp
local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if tokens == nil or last == nil then
  tokens = capacity
  last = now
end

local delta = math.max(0, now - last)
local refill = delta * refill_rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('EXPIRE', key, 3600)

return { allowed, tokens }
