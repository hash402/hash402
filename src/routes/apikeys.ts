import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { authenticateJWT, type AuthRequest } from "../middleware/auth"
import { generateApiKey } from "../lib/crypto"

const router = Router()
const prisma = new PrismaClient()

router.use(authenticateJWT)

router.get("/", async (req: AuthRequest, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { orgId: req.org.id },
      orderBy: { createdAt: "desc" },
    })

    res.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        env: key.env,
        scopes: JSON.parse(key.scopes),
        prefix: key.prefix,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        status: key.status,
      })),
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch API keys",
      },
    })
  }
})

router.post("/", async (req: AuthRequest, res) => {
  const { name, env, scopes } = req.body

  if (!name || !env || !scopes) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "Name, env, and scopes required",
      },
    })
  }

  try {
    const { prefix, key, hash } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        orgId: req.org.id,
        name,
        env,
        scopes: JSON.stringify(scopes),
        prefix,
        hash,
        status: "active",
      },
    })

    res.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        env: apiKey.env,
        scopes: JSON.parse(apiKey.scopes),
        key, // Only returned once
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create API key",
      },
    })
  }
})

router.post("/:id/rotate", async (req: AuthRequest, res) => {
  const { id } = req.params

  try {
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, orgId: req.org.id },
    })

    if (!existingKey) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "API key not found",
        },
      })
    }

    const { prefix, key, hash } = generateApiKey()

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        prefix,
        hash,
        lastUsedAt: null,
      },
    })

    res.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Only returned once
      },
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to rotate API key",
      },
    })
  }
})

router.post("/:id/revoke", async (req: AuthRequest, res) => {
  const { id } = req.params

  try {
    const apiKey = await prisma.apiKey.updateMany({
      where: { id, orgId: req.org.id },
      data: { status: "revoked" },
    })

    if (apiKey.count === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "API key not found",
        },
      })
    }

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to revoke API key",
      },
    })
  }
})

export default router
