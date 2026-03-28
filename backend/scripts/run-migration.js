const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

const pool = new Pool(poolConfig);

const runMigration = async () => {
  const client = await pool.connect();
  try {
    const migrationFile = path.join(__dirname, '../migrations/add-subscriptions.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration: add-subscriptions.sql...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
