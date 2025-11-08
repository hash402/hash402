# Hash402 API Console

Production-ready MVP for Hash402 API Console.

## Features

- **Dashboard**: Overview with KPIs, API key management, request builder, logs, webhooks, billing
- **Backend API**: Next.js API Routes with JWT auth, API key auth, rate limiting
- **Database**: Neon PostgreSQL with Prisma ORM
- **Solana Integration**: Mock anchor transactions for demo
- **Security**: HMAC webhook signing, scoped API keys, rate limiting

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

\`\`\`bash
# Clone and install
git clone <repo>
cd hash402
npm install

### Development

\`\`\`bash
# Run development server
npm run dev

# Frontend: http://localhost:3000
\`\`\`

API keys will be printed during seed.

## API Testing

1. Login to dashboard at http://localhost:3000
2. Go to "Try API" section
3. Select `/api/v1/attest` endpoint
4. Click "Send" to see live response

### API Keys
- `GET /api/apikeys` - List API keys
- `POST /api/apikeys` - Create new key
- `POST /api/apikeys/:id/rotate` - Rotate key
- `POST /api/apikeys/:id/revoke` - Revoke key


### Admin
- `GET /api/admin/metrics` - Dashboard metrics

## Testing

\`\`\`bash
npm test
\`\`\`

## Environment Variables

See deployment guide for all environment variables.

Key variables:
- `YOUR_DATABASE_URL` - Database connection (auto-configured)
- `JWT_SECRET` - JWT signing secret
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_PROGRAM_ID` - Solana program ID


## License

MIT
