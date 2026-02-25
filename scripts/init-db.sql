-- Initialize SettlingSun Database
-- This script runs automatically when the container is first created

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Database is already created by POSTGRES_DB environment variable
-- Schema will be created by Prisma migrations

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'SettlingSun database initialized successfully';
END $$;
