import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth-utils"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload?.orgId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const result = await sql`
      DELETE FROM "WebhookEndpoint"
      WHERE id = ${params.id}
      AND "orgId" = ${payload.orgId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
