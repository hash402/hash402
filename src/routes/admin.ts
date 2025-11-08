import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { authenticateJWT, type AuthRequest } from "../middleware/auth"

const router = Router()
const prisma = new PrismaClient()

router.use(authenticateJWT)

router.get("/metrics", async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const requests24h = await prisma.requestLog.count({
      where: {
        orgId: req.org.id,
        createdAt: { gte: yesterday },
      },
    })

    const logs24h = await prisma.requestLog.findMany({
      where: {
        orgId: req.org.id,
        createdAt: { gte: yesterday },
      },
      select: { latencyMs: true, status: true },
    })

    const avgLatency =
      logs24h.length > 0 ? Math.round(logs24h.reduce((sum, log) => sum + log.latencyMs, 0) / logs24h.length) : 0

    const errorCount = logs24h.filter((log) => log.status >= 400).length
    const errorRate = logs24h.length > 0 ? ((errorCount / logs24h.length) * 100).toFixed(2) : "0.00"

    const requestsMonth = await prisma.requestLog.count({
      where: {
        orgId: req.org.id,
        createdAt: { gte: monthStart },
      },
    })

    const spendMonth = (requestsMonth * 0.01).toFixed(2)

    res.json({
      requests_24h: requests24h,
      avg_latency_ms: avgLatency,
      error_rate: errorRate,
      spend_month: spendMonth,
      currency: "X402",
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch metrics",
      },
    })
  }
})

export default router
