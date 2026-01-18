const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function emergencyPasswordSync() {
  const client = await pool.connect();

  try {
    console.log('🚨 EMERGENCY PASSWORD SYNC 🚨\n');

    // Get all active users from public.tenant_users
    const users = await client.query(`
      SELECT tu.id, tu.username, tu.password_hash, tu.tenant_id, t.tenant_schema
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      WHERE tu.status = 'active'
      ORDER BY tu.id
    `);

    console.log(`Found ${users.rows.length} active users\n`);

    for (const user of users.rows) {
      console.log(`\nUser: ${user.username} (ID: ${user.id}, Schema: ${user.tenant_schema})`);
      
      // Check if user exists in tenant schema
      const tenantUserCheck = await client.query(`
        SELECT id, username FROM "${user.tenant_schema}".users WHERE username = $1
      `, [user.username]);

      if (tenantUserCheck.rows.length === 0) {
        // User doesn't exist in tenant schema - INSERT
        console.log(`  ❌ NOT FOUND in ${user.tenant_schema}.users - CREATING...`);
        
        await client.query(`
          INSERT INTO "${user.tenant_schema}".users 
          (username, password_hash, full_name, email, role, status, created_at)
          SELECT username, password_hash, full_name, email, role, status, created_at
          FROM public.tenant_users
          WHERE id = $1
        `, [user.id]);
        
        console.log(`  ✅ CREATED in ${user.tenant_schema}.users`);
      } else {
        // User exists - UPDATE password
        console.log(`  ✓ EXISTS in ${user.tenant_schema}.users (ID: ${tenantUserCheck.rows[0].id})`);
        
        await client.query(`
          UPDATE "${user.tenant_schema}".users 
          SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
          WHERE username = $2
        `, [user.password_hash, user.username]);
        
        console.log(`  ✅ PASSWORD SYNCED`);
      }
    }

    console.log('\n\n✅ EMERGENCY SYNC COMPLETED!\n');
    console.log('All users can now login with their passwords.\n');

  } catch (error) {
    console.error('❌ Emergency sync failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

emergencyPasswordSync();
