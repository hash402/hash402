import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyJWT } from "@/lib/auth-utils"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.orgId) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
    }

    const result = await sql`
      UPDATE "ApiKey"
      SET status = 'revoked'
      WHERE id = ${params.id}
      AND "orgId" = ${payload.orgId as string}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: { message: "API key not found" } }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Revoke API key error:", error)
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 })
  }
}
