/**
 * Database Connection Test Script
 * Run this to verify your DATABASE_URL is correct
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Load .env first
dotenv.config();

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

console.log('\n🔍 Testing Database Connection...\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file!');
  process.exit(1);
}

// Parse and display connection details
const url = new URL(process.env.DATABASE_URL);
console.log('📋 Connection Details:');
console.log('  Host:', url.hostname);
console.log('  Port:', url.port);
console.log('  Database:', url.pathname.substring(1));
console.log('  Username:', url.username);
console.log('  Password:', url.password ? '***' + url.password.slice(-4) : 'Not set');
console.log('  Using Pooler:', url.hostname.includes('pooler'));
console.log('');

// Test connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

try {
  console.log('⏳ Attempting to connect...');
  const client = await pool.connect();

  console.log('✅ Connection successful!');

  // Test query
  const result = await client.query('SELECT current_database(), current_user, version()');
  console.log('\n📊 Database Info:');
  console.log('  Database:', result.rows[0].current_database);
  console.log('  User:', result.rows[0].current_user);
  console.log('  Version:', result.rows[0].version.substring(0, 50) + '...');

  client.release();
  await pool.end();

  console.log('\n✅ All tests passed! Your database is connected correctly.\n');
  process.exit(0);
} catch (error: any) {
  console.error('\n❌ Connection failed!');
  console.error('Error:', error.message);

  if (error.message.includes('Tenant or user not found')) {
    console.error('\n💡 This error means your credentials are incorrect.');
    console.error('\n🔧 How to fix:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project (make sure it\'s not paused!)');
    console.error('   3. Settings → Database → Reset database password');
    console.error('   4. Copy the NEW password');
    console.error('   5. Settings → Database → Connection String (URI)');
    console.error('   6. Copy the full connection string');
    console.error('   7. Replace [YOUR_PASSWORD] with your new password');
    console.error('   8. If password has @ symbol, encode it as %40');
    console.error('   9. Update DATABASE_URL in .env file');
    console.error('   10. Run this script again to test\n');
  }

  await pool.end();
  process.exit(1);
}
