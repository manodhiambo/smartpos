const { Pool } = require('pg');
require('dotenv').config();

// Main database pool configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'smartpos',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Main pool for public schema (tenant management)
const mainPool = new Pool(poolConfig);

// Store tenant-specific pools
const tenantPools = new Map();

/**
 * Get or create a tenant-specific connection pool
 * @param {string} tenantSchema - The schema name for the tenant
 * @returns {Pool} PostgreSQL connection pool
 */
const getTenantPool = (tenantSchema) => {
  if (!tenantPools.has(tenantSchema)) {
    const pool = new Pool({
      ...poolConfig,
      max: 10,
    });
    tenantPools.set(tenantSchema, pool);
  }
  return tenantPools.get(tenantSchema);
};

/**
 * Execute query on main (public) schema
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const queryMain = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await mainPool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Main Query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Main query error:', error.message);
    throw error;
  }
};

/**
 * Execute query on tenant-specific schema
 * @param {string} tenantSchema - The schema name
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const queryTenant = async (tenantSchema, text, params = []) => {
  const pool = getTenantPool(tenantSchema);
  const start = Date.now();
  
  try {
    // Set search path to tenant schema
    await pool.query(`SET search_path TO "${tenantSchema}", public`);
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Tenant Query:', { 
        schema: tenantSchema, 
        text: text.substring(0, 100), 
        duration, 
        rows: result.rowCount 
      });
    }
    return result;
  } catch (error) {
    console.error('Tenant query error:', error.message);
    throw error;
  }
};

/**
 * Execute transaction on tenant schema
 * @param {string} tenantSchema - The schema name
 * @param {Function} callback - Transaction callback function
 * @returns {Promise} Transaction result
 */
const transactionTenant = async (tenantSchema, callback) => {
  const pool = getTenantPool(tenantSchema);
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query(`SET search_path TO "${tenantSchema}", public`);
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
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await mainPool.query('SELECT NOW() as current_time, current_database() as database');
    console.log('✅ Database connected:', result.rows[0].database);
    console.log('⏰ Server time:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Close all database pools
 */
const closeAllPools = async () => {
  try {
    await mainPool.end();
    for (const [schema, pool] of tenantPools) {
      await pool.end();
      console.log(`Closed pool for: ${schema}`);
    }
    console.log('✅ All database connections closed');
  } catch (error) {
    console.error('Error closing pools:', error.message);
  }
};

// Handle process termination
process.on('SIGTERM', closeAllPools);
process.on('SIGINT', closeAllPools);

module.exports = {
  mainPool,
  getTenantPool,
  queryMain,
  queryTenant,
  transactionTenant,
  testConnection,
  closeAllPools
};
