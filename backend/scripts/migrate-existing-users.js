const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateUsers() {
  const client = await pool.connect();

  try {
    console.log('🔄 Migrating existing users to tenant schemas...\n');

    // Get all users from public.tenant_users
    const usersResult = await client.query(`
      SELECT tu.*, t.tenant_schema
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      WHERE tu.status = 'active'
      ORDER BY tu.id
    `);

    console.log(`Found ${usersResult.rows.length} users to migrate\n`);

    for (const user of usersResult.rows) {
      const { tenant_schema, username, password_hash, full_name, email, role, status, last_login, created_at } = user;

      console.log(`Processing: ${username} → ${tenant_schema}...`);

      // Check if user exists in tenant schema
      const checkResult = await client.query(`
        SELECT id FROM "${tenant_schema}".users WHERE username = $1
      `, [username]);

      if (checkResult.rows.length === 0) {
        // Insert user into tenant schema
        await client.query(`
          INSERT INTO "${tenant_schema}".users (
            username, password_hash, full_name, email, role, status, last_login, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [username, password_hash, full_name, email, role, status, last_login || null, created_at]);
        
        console.log(`  ✅ Migrated to ${tenant_schema}.users`);
      } else {
        console.log(`  ℹ️  Already exists in ${tenant_schema}.users`);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
