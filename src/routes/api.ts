import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { authenticateApiKey, requireScope, type AuthRequest } from "../middleware/auth"
import { rateLimit } from "../middleware/ratelimit"
import { computeTxHash402, generateRequestId, sha256, hmacSha256 } from "../lib/crypto"
import { mockSignature, mockSlot, mockBlockTime, derivePDA } from "../lib/solana"
import { log } from "../lib/logger"

const router = Router()
const prisma = new PrismaClient()

router.use(authenticateApiKey)
router.use(rateLimit)

// POST /api/validate
router.post("/validate", requireScope("write"), async (req: AuthRequest, res) => {
  const { chain, wallet, tx_payload, metadata } = req.body
  const requestId = generateRequestId()

  if (!chain || !wallet || !tx_payload) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "chain, wallet, and tx_payload required",
        request_id: requestId,
      },
    })
  }

  const startTime = Date.now()

  try {
    // Compute hash
    const payloadHash = sha256(tx_payload)
    const txHash402 = computeTxHash402(wallet, payloadHash)

    // Simulate AI risk scoring (deterministic for demo)
    const riskScore = (payloadHash.charCodeAt(0) % 100) / 100
    const riskLevel = riskScore < 0.33 ? "low" : riskScore < 0.66 ? "medium" : "high"
    const decision = riskLevel === "high" ? "deny" : "allow"

    // Mock Solana anchor
    const programId = process.env.SOLANA_PROGRAM_ID || "Hash402ProgramXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    const signature = mockSignature(txHash402)
    const slot = mockSlot()
    const blockTime = mockBlockTime()
    const pdaCommitment = derivePDA(txHash402, programId)

    const response = {
      tx_hash402: txHash402,
      risk: {
        score: riskScore,
        level: riskLevel,
        reasons: ["demo model - deterministic scoring"],
      },
      decision,
      zk_proof: {
        scheme: "plonk",
        proof: "0xMOCK" + txHash402.slice(0, 60),
        publicSignals: [`0x${payloadHash.slice(0, 64)}`],
      },
      anchor: {
        program_id: programId,
        pda_commitment: pdaCommitment,
        signature,
        slot,
        block_time: blockTime,
      },
      version: "hash402-core/0.3.1-sol",
      request_id: requestId,
    }

    const latencyMs = Date.now() - startTime

    // Log request
    await prisma.requestLog.create({
      data: {
        orgId: req.org.id,
        apiKeyId: req.apiKey.id,
        endpoint: "/api/validate",
        status: 200,
        latencyMs,
        requestId,
        env: req.apiKey.env,
        wallet,
        bodyRedacted: JSON.stringify({ chain, wallet: wallet.slice(0, 8) + "..." }),
        responseRedacted: JSON.stringify(response), // Updated to include the response object
      },
    })

    log("info", "Validation completed", { requestId, decision, latencyMs })

    res.json(response)
  } catch (error: any) {
    log("error", "Validation failed", { requestId, error: error.message })
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Validation failed",
        request_id: requestId,
      },
    })
  }
})

// POST /api/attest
router.post("/attest", requireScope("attest"), async (req: AuthRequest, res) => {
  const { tx_hash402, statement, sig } = req.body
  const requestId = generateRequestId()

  if (!tx_hash402 || !statement) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "tx_hash402 and statement required",
        request_id: requestId,
      },
    })
  }

  try {
    const response = {
      ok: true,
      attestation: {
        tx_hash402,
        statement,
        node: "Node402-7",
        timestamp: new Date().toISOString(),
      },
      request_id: requestId,
    }

    await prisma.requestLog.create({
      data: {
        orgId: req.org.id,
        apiKeyId: req.apiKey.id,
        endpoint: "/api/attest",
        status: 200,
        latencyMs: 50,
        requestId,
        env: req.apiKey.env,
        bodyRedacted: JSON.stringify({ tx_hash402, statement }),
        responseRedacted: JSON.stringify({ ok: true }),
      },
    })

    res.json(response)
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Attestation failed",
        request_id: requestId,
      },
    })
  }
})

// GET /api/anchor/status
router.get("/anchor/status", requireScope("read"), async (req: AuthRequest, res) => {
  const { tx_hash402 } = req.query
  const requestId = generateRequestId()

  if (!tx_hash402) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "tx_hash402 required",
        request_id: requestId,
      },
    })
  }

  try {
    const log = await prisma.requestLog.findFirst({
      where: {
        orgId: req.org.id,
        responseRedacted: {
          contains: tx_hash402 as string,
        },
      },
    })

    if (!log) {
      return res.status(404).json({
        error: {
          code: "ANCHOR_NOT_FOUND",
          message: "No anchor found for this hash",
          request_id: requestId,
        },
      })
    }

    const programId = process.env.SOLANA_PROGRAM_ID || "Hash402ProgramXXXXXXXXXXXXXXXXXXXXXXXXXXX"

    res.json({
      tx_hash402,
      anchor: {
        program_id: programId,
        signature: mockSignature(tx_hash402 as string),
        slot: mockSlot(),
        block_time: mockBlockTime(),
        confirmed: true,
      },
      attestations_count: 1,
      request_id: requestId,
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Status check failed",
        request_id: requestId,
      },
    })
  }
})

// POST /api/batch/commit
router.post("/batch/commit", requireScope("write"), async (req: AuthRequest, res) => {
  const { merkle_root, leaves } = req.body
  const requestId = generateRequestId()

  if (!merkle_root) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "merkle_root required",
        request_id: requestId,
      },
    })
  }

  try {
    const signature = mockSignature(merkle_root)

    await prisma.requestLog.create({
      data: {
        orgId: req.org.id,
        apiKeyId: req.apiKey.id,
        endpoint: "/api/batch/commit",
        status: 200,
        latencyMs: 120,
        requestId,
        env: req.apiKey.env,
        bodyRedacted: JSON.stringify({ merkle_root }),
        responseRedacted: JSON.stringify({ signature }),
      },
    })

    res.json({
      ok: true,
      anchor: {
        signature,
        slot: mockSlot(),
        block_time: mockBlockTime(),
      },
      request_id: requestId,
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Batch commit failed",
        request_id: requestId,
      },
    })
  }
})

// POST /api/webhooks/test
router.post("/webhooks/test", requireScope("admin"), async (req: AuthRequest, res) => {
  const { event, data } = req.body
  const requestId = generateRequestId()

  if (!event) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "event required",
        request_id: requestId,
      },
    })
  }

  try {
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { orgId: req.org.id },
    })

    const deliveries = []

    for (const webhook of webhooks) {
      const events = JSON.parse(webhook.events)
      if (events.includes(event)) {
        const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() })
        const signature = hmacSha256(payload, webhook.secret)

        // In production, actually send the webhook
        deliveries.push({
          url: webhook.url,
          status: "sent",
          signature: `t=${Date.now()},s=${signature}`,
        })

        await prisma.webhookEndpoint.update({
          where: { id: webhook.id },
          data: { lastDeliveredAt: new Date() },
        })
      }
    }

    res.json({
      ok: true,
      deliveries,
      request_id: requestId,
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Webhook test failed",
        request_id: requestId,
      },
    })
  }
})

export default router
