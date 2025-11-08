import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth"
import apiKeysRoutes from "./routes/apikeys"
import apiRoutes from "./routes/api"
import adminRoutes from "./routes/admin"
import { errorHandler } from "./middleware/errorHandler"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     credentials: true,
//   }),
// )
app.use(express.json())
app.use(express.raw({ type: "application/json", limit: "10mb" }))

// Routes
app.use("/auth", authRoutes)
app.use("/apikeys", apiKeysRoutes)
app.use("/api", apiRoutes)
app.use("/admin", adminRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[v0] Hash402 API Server running on port ${PORT}`)
  console.log(`[v0] Environment: ${process.env.NODE_ENV || "development"}`)
})
