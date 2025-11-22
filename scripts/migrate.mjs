import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.zinkhfibqugkfpipjltg:talha@4655@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
});

const runMigration = async () => {
  const client = await pool.connect();
  try {
    const migrationDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
    const latestMigration = files.pop();

    if (latestMigration) {
      console.log(`Applying migration: ${latestMigration}`);
      const filePath = path.join(migrationDir, latestMigration);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`Migration ${latestMigration} applied successfully.`);
    } else {
      console.log('No new migrations to apply.');
    }
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
};

runMigration();
