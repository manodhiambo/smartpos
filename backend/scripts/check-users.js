const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  const client = await pool.connect();

  try {
    console.log('\n=== CHECKING USER SYNCHRONIZATION ===\n');

    // Get users from public.tenant_users
    const publicUsers = await client.query(`
      SELECT tu.id, tu.username, tu.tenant_id, t.tenant_schema
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      WHERE tu.status = 'active'
      ORDER BY tu.id
    `);

    console.log(`Found ${publicUsers.rows.length} users in public.tenant_users:\n`);

    for (const user of publicUsers.rows) {
      console.log(`User ID ${user.id}: ${user.username} (Tenant: ${user.tenant_schema})`);
      
      // Check if exists in tenant schema
      try {
        const tenantUser = await client.query(`
          SELECT id FROM "${user.tenant_schema}".users WHERE username = $1
        `, [user.username]);

        if (tenantUser.rows.length > 0) {
          console.log(`  ✅ Exists in ${user.tenant_schema}.users (ID: ${tenantUser.rows[0].id})`);
        } else {
          console.log(`  ❌ NOT FOUND in ${user.tenant_schema}.users`);
        }
      } catch (error) {
        console.log(`  ❌ ERROR checking ${user.tenant_schema}.users:`, error.message);
      }
      console.log();
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();
