export function log(level: "info" | "warn" | "error", message: string, meta?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  }

  if (level === "error") {
    console.error(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}
