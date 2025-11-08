import { Router } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../lib/crypto"
import { authenticateJWT, type AuthRequest } from "../middleware/auth"

const router = Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

router.post("/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "Email and password required",
      },
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { org: true },
    })

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        },
      })
    }

    const token = jwt.sign({ userId: user.id, orgId: user.orgId }, JWT_SECRET, { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        org: {
          id: user.org.id,
          name: user.org.name,
          plan: user.org.plan,
        },
      },
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Login failed",
      },
    })
  }
})

router.get("/me", authenticateJWT, async (req: AuthRequest, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      org: {
        id: req.org.id,
        name: req.org.name,
        plan: req.org.plan,
      },
    },
  })
})

export default router
