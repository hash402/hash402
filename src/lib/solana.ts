import * as crypto from "crypto"

export function mockSignature(txHash402: string): string {
  // Generate deterministic mock signature
  const hash = crypto.createHash("sha256").update(txHash402).digest("hex")
  return hash.slice(0, 88) // Solana signatures are base58, ~88 chars
}

export function mockSlot(): number {
  // Return a realistic-looking slot number
  return 265019392 + Math.floor(Math.random() * 10000)
}

export function mockBlockTime(): number {
  return Math.floor(Date.now() / 1000)
}

export function derivePDA(txHash402: string, programId: string): string {
  const hash = crypto.createHash("sha256").update(`${programId}:${txHash402}`).digest("hex")
  return hash.slice(0, 44) // Mock PDA address
}

export function formatSolanaAddress(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}
