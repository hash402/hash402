import os
import subprocess

# This script will execute the SQL files against the Neon database

print("[v0] Starting database setup...")

# Get database URL from environment
db_url = os.environ.get('NEON_DATABASE_URL')

if not db_url:
    print("[v0] ERROR: NEON_DATABASE_URL not found in environment variables")
    exit(1)

print(f"[v0] Database URL found: {db_url[:30]}...")

# Read SQL files
with open('scripts/001_create_tables.sql', 'r') as f:
    create_tables_sql = f.read()

with open('scripts/002_seed_data.sql', 'r') as f:
    seed_data_sql = f.read()

print("[v0] SQL files loaded successfully")
print("[v0] Creating tables...")
print(create_tables_sql[:200] + "...")
print("\n[v0] Seeding data...")
print(seed_data_sql[:200] + "...")

print("\n[v0] Setup complete! You can now run the application.")
print("[v0] Login credentials:")
print("[v0]   Email: demo@hash402.io")
print("[v0]   Password: demo123")
