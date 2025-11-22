import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    '❌ DATABASE_URL is not set in .env file! Please add your PostgreSQL connection string.'
  );
}

console.log('📦 Database Configuration:');
const dbUrl = process.env.DATABASE_URL;
console.log('  Connection String:', dbUrl.substring(0, 50) + '...');
console.log('  Database Type: PostgreSQL (local)');

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize Drizzle ORM with PostgreSQL
export const db = drizzle(pool, { schema });