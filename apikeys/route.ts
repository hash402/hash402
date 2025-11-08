import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyJWT, generateApiKey, hashApiKey } from "@/lib/auth-utils"
import { nanoid } from "nanoid"

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = await verifyJWT(token)
  return payload
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request)
    if (!payload || !payload.orgId) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
    }

    const apiKeys = await sql`
      SELECT * FROM "ApiKey"
      WHERE "orgId" = ${payload.orgId as string}
      ORDER BY "createdAt" DESC
    `

    const parsedApiKeys = apiKeys.map((key: any) => ({
      ...key,
      scopes: typeof key.scopes === "string" ? JSON.parse(key.scopes) : key.scopes || [],
    }))

    return NextResponse.json({ apiKeys: parsedApiKeys })
  } catch (error) {
    console.error("[v0] Get API keys error:", error)
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API Key creation started")

    const payload = await getAuthUser(request)
    console.log("[v0] Auth payload:", payload)

    if (!payload || !payload.orgId) {
      console.log("[v0] Unauthorized - missing payload or orgId")
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { name, env, scopes } = body

    if (!name || !env || !scopes) {
      console.log("[v0] Missing required fields:", { name, env, scopes })
      return NextResponse.json({ error: { message: "Name, env, and scopes are required" } }, { status: 400 })
    }

    let apiKey
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        const { key, prefix } = generateApiKey(env)
        const hash = await hashApiKey(key)
        const id = nanoid()

        console.log("[v0] Generated API key data (attempt ${attempts + 1}):", { id, prefix, orgId: payload.orgId })

        const result = await sql`
          INSERT INTO "ApiKey" (id, "orgId", name, env, scopes, prefix, hash, status, "createdAt")
          VALUES (
            ${id},
            ${payload.orgId as string},
            ${name},
            ${env},
            ${JSON.stringify(scopes)},
            ${prefix},
            ${hash},
            'active',
            NOW()
          )
          RETURNING *
        `

        console.log("[v0] API key created successfully")
        apiKey = {
          ...result[0],
          scopes: typeof result[0].scopes === "string" ? JSON.parse(result[0].scopes) : result[0].scopes || [],
          key, // Only returned once on creation
        }
        break // Success, exit loop
      } catch (err: any) {
        if (err.message?.includes("duplicate key") && attempts < maxAttempts - 1) {
          console.log("[v0] Prefix collision detected, retrying...")
          attempts++
          continue // Retry with new prefix
        }
        throw err // Re-throw if not a collision or max attempts reached
      }
    }

    if (!apiKey) {
      throw new Error("Failed to generate unique API key after multiple attempts")
    }

    return NextResponse.json({ apiKey })
  } catch (error) {
    console.error("[v0] Create API key error:", error)
    return NextResponse.json(
      {
        error: {
          message: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    )
  }
}
