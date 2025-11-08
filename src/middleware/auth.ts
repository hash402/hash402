import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { hashApiKey } from "../lib/crypto"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthRequest extends Request {
  user?: any
  org?: any
  apiKey?: any
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "No token provided",
      },
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { org: true },
    })

    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token",
        },
      })
    }

    req.user = user
    req.org = user.org
    next()
  } catch (error) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    })
  }
}

export async function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "API key required",
      },
    })
  }

  const apiKeyValue = authHeader.slice(7)
  const hash = hashApiKey(apiKeyValue)

  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { hash, status: "active" },
      include: { org: true },
    })

    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API key",
        },
      })
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    req.apiKey = apiKey
    req.org = apiKey.org
    next()
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Authentication failed",
      },
    })
  }
}

export function requireScope(scope: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "API key required",
        },
      })
    }

    const scopes = JSON.parse(req.apiKey.scopes)
    if (!scopes.includes(scope) && !scopes.includes("admin")) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Scope '${scope}' required`,
        },
      })
    }

    next()
  }
}
