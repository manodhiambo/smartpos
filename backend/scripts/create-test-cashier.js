const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestCashier() {
  const client = await pool.connect();

  try {
    console.log('\n🧪 CREATING TEST CASHIER\n');

    // Get the admin tenant
    const tenant = await client.query(`
      SELECT id, tenant_schema FROM public.tenants 
      WHERE tenant_schema = 'admin_tenant' 
      LIMIT 1
    `);

    if (tenant.rows.length === 0) {
      console.error('❌ Admin tenant not found!');
      return;
    }

    const tenantId = tenant.rows[0].id;
    const tenantSchema = tenant.rows[0].tenant_schema;

    console.log(`✓ Found tenant: ${tenantSchema} (ID: ${tenantId})\n`);

    // Test credentials
    const username = 'cashier1';
    const password = 'Cashier@123';
    const fullName = 'Test Cashier';
    const role = 'cashier';

    console.log('Creating cashier with:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: ${role}\n`);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user exists in public.tenant_users
    const existingPublic = await client.query(`
      SELECT id FROM public.tenant_users 
      WHERE tenant_id = $1 AND username = $2
    `, [tenantId, username]);

    if (existingPublic.rows.length > 0) {
      console.log('⚠️  User exists in public.tenant_users - UPDATING...');
      
      await client.query(`
        UPDATE public.tenant_users 
        SET password_hash = $1, full_name = $2, role = $3, status = 'active'
        WHERE tenant_id = $4 AND username = $5
      `, [passwordHash, fullName, role, tenantId, username]);
      
      console.log('✅ Updated in public.tenant_users');
    } else {
      console.log('Creating in public.tenant_users...');
      
      await client.query(`
        INSERT INTO public.tenant_users 
        (tenant_id, username, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
      `, [tenantId, username, passwordHash, fullName, role]);
      
      console.log('✅ Created in public.tenant_users');
    }

    // Check if user exists in tenant schema
    const existingTenant = await client.query(`
      SELECT id FROM "${tenantSchema}".users WHERE username = $1
    `, [username]);

    if (existingTenant.rows.length > 0) {
      console.log(`⚠️  User exists in ${tenantSchema}.users - UPDATING...`);
      
      await client.query(`
        UPDATE "${tenantSchema}".users 
        SET password_hash = $1, full_name = $2, role = $3, status = 'active'
        WHERE username = $4
      `, [passwordHash, fullName, role, username]);
      
      console.log(`✅ Updated in ${tenantSchema}.users`);
    } else {
      console.log(`Creating in ${tenantSchema}.users...`);
      
      await client.query(`
        INSERT INTO "${tenantSchema}".users 
        (username, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, 'active')
      `, [username, passwordHash, fullName, role]);
      
      console.log(`✅ Created in ${tenantSchema}.users`);
    }

    console.log('\n✅ TEST CASHIER READY!\n');
    console.log('═══════════════════════════════════════');
    console.log('LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log(`Business Email: demo@smartpos.com`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestCashier();
