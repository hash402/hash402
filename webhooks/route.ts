import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth-utils"
import { sql } from "@/lib/db"
import { nanoid } from "nanoid"

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

    const webhooks = await sql`
      SELECT id, url, events, "createdAt", "lastDeliveredAt"
      FROM "WebhookEndpoint"
      WHERE "orgId" = ${payload.orgId}
      ORDER BY "createdAt" DESC
    `

    // Parse events JSON for each webhook
    const parsedWebhooks = webhooks.map((webhook) => ({
      ...webhook,
      events: JSON.parse(webhook.events || "[]"),
    }))

    return NextResponse.json({ webhooks: parsedWebhooks })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { url, events } = body

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const id = nanoid()
    const secret = nanoid(32)

    await sql`
      INSERT INTO "WebhookEndpoint" (id, "orgId", url, events, secret, "createdAt")
      VALUES (
        ${id},
        ${payload.orgId},
        ${url},
        ${JSON.stringify(events)},
        ${secret},
        NOW()
      )
    `

    return NextResponse.json({
      webhook: {
        id,
        url,
        events,
        secret,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
