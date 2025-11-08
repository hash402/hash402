import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyJWT } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: { message: "Invalid token" } }, { status: 401 })
    }

    const users = await sql`
      SELECT u.*, o.id as org_id, o.name as org_name, o.plan as org_plan
      FROM "User" u
      LEFT JOIN "Org" o ON u."orgId" = o.id
      WHERE u.id = ${payload.userId as string}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: { message: "User not found" } }, { status: 404 })
    }

    const user = users[0]

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        org: {
          id: user.org_id,
          name: user.org_name,
          plan: user.org_plan,
        },
      },
    })
  } catch (error) {
    console.error("[v0] Get me error:", error)
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 })
  }
}
