-- PostgreSQL initialization script
-- This runs automatically when the container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For AI semantic search (pgvector)

-- Create the application database user with limited privileges (for production)
-- In development, we use the superuser for convenience

-- Log that initialization is complete
DO $$
BEGIN
  RAISE NOTICE 'Ngurra database initialized with extensions: uuid-ossp, pgcrypto, vector';
END $$;
