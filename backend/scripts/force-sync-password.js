const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function forceSyncPassword() {
  const client = await pool.connect();

  try {
    console.log('🔄 Force syncing all passwords...\n');

    const users = await client.query(`
      SELECT tu.username, tu.password_hash, t.tenant_schema
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      WHERE tu.status = 'active'
    `);

    for (const user of users.rows) {
      console.log(`Syncing: ${user.username} → ${user.tenant_schema}`);
      
      await client.query(`
        UPDATE "${user.tenant_schema}".users 
        SET password_hash = $1 
        WHERE username = $2
      `, [user.password_hash, user.username]);
      
      console.log(`  ✅ Password synced`);
    }

    console.log('\n✅ All passwords synced!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

forceSyncPassword();
