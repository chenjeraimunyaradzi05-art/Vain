#!/usr/bin/env node
/**
 * Database Migration Helper
 * 
 * Handles migration from SQLite (development) to PostgreSQL (production)
 * 
 * Usage:
 *   node scripts/migrate-to-postgres.js --check    # Check migration status
 *   node scripts/migrate-to-postgres.js --prepare  # Prepare PostgreSQL schema
 *   node scripts/migrate-to-postgres.js --migrate  # Run migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRISMA_DIR = path.join(__dirname, '..', 'prisma');
const SQLITE_SCHEMA = path.join(PRISMA_DIR, 'schema.sqlite.prisma');
const POSTGRES_SCHEMA = path.join(PRISMA_DIR, 'schema.postgresql.prisma');
const ACTIVE_SCHEMA = path.join(PRISMA_DIR, 'schema.prisma');

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

function error(msg) {
  console.error(`[migrate] ERROR: ${msg}`);
  process.exit(1);
}

function checkStatus() {
  log('Checking migration status...');
  
  // Check which schema is active
  if (fs.existsSync(ACTIVE_SCHEMA)) {
    const content = fs.readFileSync(ACTIVE_SCHEMA, 'utf8');
    if (content.includes('provider = "postgresql"')) {
      log('✓ Active schema: PostgreSQL');
    } else if (content.includes('provider = "sqlite"')) {
      log('⚠ Active schema: SQLite (development)');
    }
  } else {
    log('⚠ No active schema.prisma found');
  }
  
  // Check if PostgreSQL schema exists
  if (fs.existsSync(POSTGRES_SCHEMA)) {
    log('✓ PostgreSQL schema file exists');
  } else {
    log('✗ PostgreSQL schema file missing');
  }
  
  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    log('✓ DATABASE_URL points to PostgreSQL');
  } else if (dbUrl.startsWith('file:')) {
    log('⚠ DATABASE_URL points to SQLite');
  } else {
    log('⚠ DATABASE_URL not set or unknown format');
  }
  
  // Check for pending migrations
  try {
    const status = execSync('npx prisma migrate status', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    log('Migration status:');
    console.log(status);
  } catch (e) {
    log('Could not check migration status (may need database connection)');
  }
}

function preparePostgres() {
  log('Preparing PostgreSQL schema...');
  
  // Backup current schema
  if (fs.existsSync(ACTIVE_SCHEMA)) {
    const backupPath = path.join(PRISMA_DIR, `schema.backup.${Date.now()}.prisma`);
    fs.copyFileSync(ACTIVE_SCHEMA, backupPath);
    log(`Backed up current schema to ${backupPath}`);
  }
  
  // Check if PostgreSQL schema exists
  if (!fs.existsSync(POSTGRES_SCHEMA)) {
    error('PostgreSQL schema file not found. Please create it first.');
  }
  
  // Copy PostgreSQL schema to active
  fs.copyFileSync(POSTGRES_SCHEMA, ACTIVE_SCHEMA);
  log('✓ Copied PostgreSQL schema to schema.prisma');
  
  // Generate Prisma client
  log('Generating Prisma client...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    log('✓ Prisma client generated');
  } catch (e) {
    error('Failed to generate Prisma client');
  }
  
  log('');
  log('Next steps:');
  log('1. Set DATABASE_URL to your PostgreSQL connection string');
  log('2. Run: npx prisma migrate deploy');
  log('3. Run: npx prisma db seed (if you have seed data)');
}

function runMigration() {
  log('Running database migration...');
  
  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    error('DATABASE_URL environment variable not set');
  }
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    error('DATABASE_URL must be a PostgreSQL connection string');
  }
  
  // Run migrations
  log('Deploying migrations...');
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    log('✓ Migrations deployed successfully');
  } catch (e) {
    error('Migration failed. Check the error above.');
  }
  
  // Verify connection
  log('Verifying database connection...');
  try {
    execSync('npx prisma db execute --stdin', {
      input: 'SELECT 1;',
      cwd: path.join(__dirname, '..')
    });
    log('✓ Database connection verified');
  } catch (e) {
    log('⚠ Could not verify connection (non-critical)');
  }
  
  log('');
  log('Migration complete! Your database is ready for production.');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--check') || args.includes('-c')) {
  checkStatus();
} else if (args.includes('--prepare') || args.includes('-p')) {
  preparePostgres();
} else if (args.includes('--migrate') || args.includes('-m')) {
  runMigration();
} else {
  console.log(`
Database Migration Helper

Usage:
  node scripts/migrate-to-postgres.js --check    Check current migration status
  node scripts/migrate-to-postgres.js --prepare  Prepare PostgreSQL schema
  node scripts/migrate-to-postgres.js --migrate  Run database migration

Environment:
  DATABASE_URL    PostgreSQL connection string (required for --migrate)

Example:
  export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
  node scripts/migrate-to-postgres.js --prepare
  node scripts/migrate-to-postgres.js --migrate
`);
}
