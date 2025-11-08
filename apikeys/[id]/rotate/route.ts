import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyJWT, generateApiKey, hashApiKey } from "@/lib/auth-utils"

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

    const existingKeys = await sql`
      SELECT * FROM "ApiKey"
      WHERE id = ${params.id}
      AND "orgId" = ${payload.orgId as string}
      LIMIT 1
    `

    if (existingKeys.length === 0) {
      return NextResponse.json({ error: { message: "API key not found" } }, { status: 404 })
    }

    const existingKey = existingKeys[0]
    const { key, prefix } = generateApiKey(existingKey.env as "sandbox" | "mainnet")
    const hash = await hashApiKey(key)

    const apiKeys = await sql`
      UPDATE "ApiKey"
      SET prefix = ${prefix}, hash = ${hash}
      WHERE id = ${params.id}
      RETURNING *
    `

    const apiKey = apiKeys[0]

    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key, // Only returned once on rotation
      },
    })
  } catch (error) {
    console.error("[v0] Rotate API key error:", error)
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 })
  }
}
