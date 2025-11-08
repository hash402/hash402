import * as crypto from "crypto"

export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

export function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex")
}

export function hashPassword(password: string): string {
  return sha256(password)
}

export function hashApiKey(key: string): string {
  return sha256(key)
}

export function generateApiKey(): { prefix: string; key: string; hash: string } {
  const prefix = "hsh402"
  const random = crypto.randomBytes(32).toString("hex")
  const key = `${prefix}_${random}`
  const hash = hashApiKey(key)
  return { prefix, key, hash }
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(16).toString("hex")}`
}

export function computeTxHash402(wallet: string, payloadHash: string): string {
  const domain = "hash402.solana"
  return sha256(`${domain}|${wallet}|${payloadHash}`)
}
