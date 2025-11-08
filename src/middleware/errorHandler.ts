import type { Request, Response, NextFunction } from "express"
import { log } from "../lib/logger"

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  log("error", err.message, { stack: err.stack, path: req.path })

  const statusCode = err.statusCode || 500
  const code = err.code || "INTERNAL_ERROR"

  res.status(statusCode).json({
    error: {
      code,
      message: err.message || "Internal server error",
      request_id: (req as any).requestId,
    },
  })
}
