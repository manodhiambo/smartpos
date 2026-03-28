const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Force DATABASE_URL from .env file to override any stale value set in Render dashboard
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (match) {
    process.env.DATABASE_URL = match[1].trim();
  }
} catch (e) {
  // .env not present, rely on environment variable as-is
}

// Parse DATABASE_URL for production or use individual env vars
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'smartpos',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  if (process.env.DB_PASSWORD) {
    config.password = process.env.DB_PASSWORD;
  }

  return config;
};

// Create main pool
const mainPool = new Pool(getDatabaseConfig());

// Cache for tenant-specific pools
const tenantPools = new Map();

/**
 * Get or create a pool for a specific tenant schema
 */
const getTenantPool = (tenantSchema) => {
  if (!tenantPools.has(tenantSchema)) {
    const config = getDatabaseConfig();
    config.searchPath = tenantSchema;
    tenantPools.set(tenantSchema, new Pool(config));
  }
  return tenantPools.get(tenantSchema);
};

/**
 * Query the main database (public schema)
 */
const queryMain = async (text, params) => {
  return await mainPool.query(text, params);
};

/**
 * Query a tenant-specific schema
 */
const queryTenant = async (tenantSchema, text, params) => {
  const pool = getTenantPool(tenantSchema);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${tenantSchema}"`);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Execute multiple queries in a transaction
 */
const transactionTenant = async (tenantSchema, callback) => {
  const pool = getTenantPool(tenantSchema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET search_path TO "${tenantSchema}"`);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const result = await mainPool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`   Time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Close all database connections
 */
const closeAllPools = async () => {
  console.log('🔒 Closing database connections...');
  
  for (const [schema, pool] of tenantPools.entries()) {
    await pool.end();
    console.log(`   Closed pool for schema: ${schema}`);
  }
  
  await mainPool.end();
  console.log('   Closed main pool');
};

module.exports = {
  mainPool,
  queryMain,
  queryTenant,
  transactionTenant,
  testConnection,
  closeAllPools
};
