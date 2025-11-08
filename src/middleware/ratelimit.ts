import type { Request, Response, NextFunction } from "express"
import { LRUCache } from "lru-cache"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const cache = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 60000, // 1 minute
})

const RATE_LIMIT = 60 // requests per minute
const WINDOW_MS = 60000 // 1 minute

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.headers.authorization || req.ip || "anonymous"
  const now = Date.now()

  let entry = cache.get(key)

  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + WINDOW_MS,
    }
  }

  entry.count++
  cache.set(key, entry)

  const remaining = Math.max(0, RATE_LIMIT - entry.count)
  const resetIn = Math.ceil((entry.resetAt - now) / 1000)

  res.setHeader("X-RateLimit-Limit", RATE_LIMIT.toString())
  res.setHeader("X-RateLimit-Remaining", remaining.toString())
  res.setHeader("X-RateLimit-Reset", resetIn.toString())

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
        retry_after: resetIn,
      },
    })
  }

  next()
}
