const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_r7DKAjGRLoe2@ep-solitary-mouse-afhhi6v8.us-west-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
  const client = await pool.connect();
  
  try {
    const newPassword = 'Smart@2026';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    const result = await client.query(
      `UPDATE public.tenant_users 
       SET password_hash = $1 
       WHERE username = 'Admin' AND tenant_id = 1
       RETURNING username, full_name`,
      [passwordHash]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully!');
      console.log(`   User: ${result.rows[0].username}`);
      console.log(`   Name: ${result.rows[0].full_name}`);
      console.log(`   New Password: ${newPassword}`);
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPassword();
