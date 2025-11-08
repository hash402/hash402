-- Seed data for Hash402 API Console
-- Demo wallet address: 7xKXtg2CZ8UkDQRKwjGkJKRKwjGkJKRKwjGkJKRKwjGk

-- Insert demo organization
INSERT INTO "Org" ("id", "name", "plan", "createdAt")
VALUES ('org_demo123', 'Demo Organization', 'pro', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Updated to use walletAddress instead of email/passwordHash
-- Insert demo user with Solana wallet
INSERT INTO "User" ("id", "walletAddress", "orgId", "createdAt")
VALUES (
    'user_demo123',
    '7xKXtg2CZ8UkDQRKwjGkJKRKwjGkJKRKwjGkJKRKwjGk',
    'org_demo123',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("walletAddress") DO NOTHING;

-- Insert demo API keys
INSERT INTO "ApiKey" ("id", "orgId", "name", "env", "scopes", "prefix", "hash", "createdAt", "status")
VALUES 
(
    'key_sandbox_demo',
    'org_demo123',
    'Sandbox Test Key',
    'sandbox',
    '["validate","store","retrieve"]',
    'h402_test_demo',
    'hashed_key_value_sandbox',
    CURRENT_TIMESTAMP,
    'active'
),
(
    'key_mainnet_demo',
    'org_demo123',
    'Production Key',
    'mainnet',
    '["validate","store"]',
    'h402_live_demo',
    'hashed_key_value_mainnet',
    CURRENT_TIMESTAMP,
    'active'
)
ON CONFLICT ("prefix") DO NOTHING;

-- Insert sample request logs
INSERT INTO "RequestLog" ("id", "orgId", "apiKeyId", "endpoint", "status", "latencyMs", "requestId", "env", "wallet", "createdAt")
VALUES 
(
    'log_1',
    'org_demo123',
    'key_sandbox_demo',
    '/api/validate',
    200,
    45,
    'req_demo_1',
    'sandbox',
    '7xKXtg2CZ8UkDQRKwjGkJKRKwjGkJKRKwjGkJKRKwjGk',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    'log_2',
    'org_demo123',
    'key_sandbox_demo',
    '/api/store',
    201,
    89,
    'req_demo_2',
    'sandbox',
    '8yLYuh3DZ9VlERSLxkHlKLSLxkHlKLSLxkHlKLSLxkHl',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    'log_3',
    'org_demo123',
    'key_mainnet_demo',
    '/api/validate',
    200,
    52,
    'req_demo_3',
    'mainnet',
    '9zMZvi4EA0WmFSTMylImLTMylImLTMylImLTMylImLTM',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
)
ON CONFLICT ("requestId") DO NOTHING;

-- Insert sample webhook endpoint
INSERT INTO "WebhookEndpoint" ("id", "orgId", "url", "secret", "events", "createdAt")
VALUES (
    'webhook_demo',
    'org_demo123',
    'https://example.com/webhooks/hash402',
    'whsec_demo_secret_key',
    '["hash.validated","hash.stored"]',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Insert sample invoice
INSERT INTO "Invoice" ("id", "orgId", "amount", "currency", "periodStart", "periodEnd", "status", "createdAt")
VALUES (
    'inv_demo',
    'org_demo123',
    49.99,
    'USD',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP,
    'paid',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
)
ON CONFLICT ("id") DO NOTHING;
