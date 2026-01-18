const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_r7DKAjGRLoe2@ep-solitary-mouse-afhhi6v8.us-west-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function syncTenantUsers() {
  const client = await pool.connect();

  try {
    console.log('🔄 Syncing tenant users...\n');

    // Get all users from public.tenant_users
    const usersResult = await client.query(`
      SELECT tu.*, t.tenant_schema
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      ORDER BY tu.id
    `);

    console.log(`Found ${usersResult.rows.length} users to sync\n`);

    for (const user of usersResult.rows) {
      const { tenant_schema, username, password_hash, full_name, email, role, status, last_login, created_at } = user;

      console.log(`Processing: ${username} in ${tenant_schema}...`);

      // Check if user exists in tenant schema
      const existingUser = await client.query(`
        SELECT id FROM "${tenant_schema}".users WHERE username = $1
      `, [username]);

      if (existingUser.rows.length === 0) {
        // Insert user into tenant schema
        await client.query(`
          INSERT INTO "${tenant_schema}".users (
            username, password_hash, full_name, email, role, status, last_login, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [username, password_hash, full_name, email, role, status, last_login, created_at]);
        
        console.log(`  ✅ Created user in ${tenant_schema}.users`);
      } else {
        console.log(`  ℹ️  User already exists in ${tenant_schema}.users`);
      }
    }

    console.log('\n✅ User sync completed!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncTenantUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
