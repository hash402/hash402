import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth-utils"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
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

    // Fetch logs for the user's organization
    const logs = await sql`
      SELECT 
        id,
        endpoint,
        status,
        "latencyMs",
        "requestId",
        env,
        wallet,
        "createdAt",
        "bodyRedacted",
        "responseRedacted"
      FROM "RequestLog"
      WHERE "orgId" = ${payload.orgId}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
