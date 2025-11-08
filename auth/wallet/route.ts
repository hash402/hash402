import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { signJWT } from "@/lib/auth-utils"
import { verifyWalletSignature } from "@/lib/wallet-auth"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === Wallet Auth Request Started ===")

    const body = await request.json()
    console.log("[v0] Request body received:", {
      hasWalletAddress: !!body.walletAddress,
      hasSignature: !!body.signature,
      hasMessage: !!body.message,
    })

    const { walletAddress, signature, message } = body

    if (!walletAddress || !signature || !message) {
      console.log("[v0] Missing required fields")
      return NextResponse.json(
        { error: { message: "Wallet address, signature, and message are required" } },
        { status: 400 },
      )
    }

    console.log("[v0] Starting signature verification...")
    let isValid = false
    try {
      isValid = await verifyWalletSignature(walletAddress, signature, message)
      console.log("[v0] Signature verification result:", isValid)
    } catch (verifyError) {
      console.error("[v0] Signature verification threw error:", verifyError)
      return NextResponse.json(
        {
          error: {
            message: "Signature verification failed",
            details: verifyError instanceof Error ? verifyError.message : String(verifyError),
          },
        },
        { status: 500 },
      )
    }

    if (!isValid) {
      console.log("[v0] Invalid signature - authentication failed")
      return NextResponse.json({ error: { message: "Invalid signature" } }, { status: 401 })
    }

    console.log("[v0] Signature valid, looking up user in database...")
    let user
    try {
      const users = await sql`
        SELECT u.*, o.id as org_id, o.name as org_name, o.plan as org_plan
        FROM "User" u
        LEFT JOIN "Org" o ON u."orgId" = o.id
        WHERE u."walletAddress" = ${walletAddress}
        LIMIT 1
      `
      user = users[0]
      console.log("[v0] User lookup result:", user ? "found" : "not found")
    } catch (dbError) {
      console.error("[v0] Database lookup error:", dbError)
      return NextResponse.json(
        {
          error: {
            message: "Database error during user lookup",
            details: dbError instanceof Error ? dbError.message : String(dbError),
          },
        },
        { status: 500 },
      )
    }

    if (!user) {
      console.log("[v0] User not found, creating new org and user...")
      try {
        const orgId = nanoid()
        const userId = nanoid()

        // Create org first
        const orgs = await sql`
          INSERT INTO "Org" (id, name, plan, "createdAt", "updatedAt")
          VALUES (
            ${orgId},
            ${`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} Org`},
            'free',
            NOW(),
            NOW()
          )
          RETURNING *
        `
        const org = orgs[0]
        console.log("[v0] Org created with ID:", org.id)

        // Create user
        const newUsers = await sql`
          INSERT INTO "User" (id, "walletAddress", "orgId", "createdAt", "updatedAt")
          VALUES (${userId}, ${walletAddress}, ${org.id}, NOW(), NOW())
          RETURNING *
        `
        const newUser = newUsers[0]
        console.log("[v0] User created with ID:", newUser.id)

        // Fetch complete user data with org
        const completeUsers = await sql`
          SELECT u.*, o.id as org_id, o.name as org_name, o.plan as org_plan
          FROM "User" u
          LEFT JOIN "Org" o ON u."orgId" = o.id
          WHERE u.id = ${newUser.id}
          LIMIT 1
        `
        user = completeUsers[0]
      } catch (createError) {
        console.error("[v0] Error creating user/org:", createError)
        return NextResponse.json(
          {
            error: {
              message: "Failed to create user account",
              details: createError instanceof Error ? createError.message : String(createError),
            },
          },
          { status: 500 },
        )
      }
    }

    console.log("[v0] Generating JWT token...")
    let token
    try {
      token = await signJWT({
        userId: user.id,
        orgId: user.orgId || user.org_id,
        walletAddress: user.walletAddress,
      })
      console.log("[v0] JWT generated successfully")
    } catch (jwtError) {
      console.error("[v0] JWT generation error:", jwtError)
      return NextResponse.json(
        {
          error: {
            message: "Failed to generate authentication token",
            details: jwtError instanceof Error ? jwtError.message : String(jwtError),
          },
        },
        { status: 500 },
      )
    }

    console.log("[v0] === Wallet Auth Request Completed Successfully ===")
    return NextResponse.json({
      token,
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
    console.error("[v0] Unexpected error in wallet auth:", error)
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
