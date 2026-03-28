const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection, queryMain } = require('./config/database');
const routes = require('./routes');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for Render.com and rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email configuration check
if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
  console.log('⚠️  Email not configured - emails will be logged to console');
}

// Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SmartPOS Backend API',
    environment: process.env.NODE_ENV 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Run schema init (creates tables if not exist)
    try {
      const initSql = fs.readFileSync(
        path.join(__dirname, 'migrations/init-schema.sql'), 'utf8'
      );
      await queryMain(initSql);
      console.log('✅ Schema initialized');
    } catch (initError) {
      console.warn('⚠️  Schema init warning:', initError.message);
    }

    // Run subscription migrations
    try {
      const migrationSql = fs.readFileSync(
        path.join(__dirname, 'migrations/add-subscriptions.sql'), 'utf8'
      );
      await queryMain(migrationSql);
      console.log('✅ Subscription migrations applied');
    } catch (migrationError) {
      console.warn('⚠️  Migration warning:', migrationError.message);
    }

    // Seed demo tenant and admin user if not present
    try {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test@2025', 10);

      // Ensure demo tenant exists
      let tenantId;
      const tenantCheck = await queryMain(
        "SELECT id FROM public.tenants WHERE business_email = 'demo@smartpos.com'"
      );
      if (tenantCheck.rows.length === 0) {
        const tenantResult = await queryMain(
          `INSERT INTO public.tenants (tenant_name, tenant_schema, business_name, business_email, business_phone, subscription_status, subscription_plan)
           VALUES ($1, $2, $3, $4, $5, 'active', 'trial') RETURNING id`,
          ['SmartPOS Demo Store', 'admin_tenant', 'SmartPOS Demo Supermarket', 'demo@smartpos.com', '+254712345678']
        );
        tenantId = tenantResult.rows[0].id;
        console.log('✅ Demo tenant seeded');
      } else {
        tenantId = tenantCheck.rows[0].id;
      }

      // Ensure Admin user exists with correct password
      const userCheck = await queryMain(
        "SELECT id FROM public.tenant_users WHERE tenant_id = $1 AND username = 'Admin'",
        [tenantId]
      );
      if (userCheck.rows.length === 0) {
        await queryMain(
          `INSERT INTO public.tenant_users (tenant_id, username, password_hash, full_name, email, role, status)
           VALUES ($1, 'Admin', $2, 'System Administrator', 'demo@smartpos.com', 'admin', 'active')`,
          [tenantId, passwordHash]
        );
        console.log('✅ Demo admin user seeded');
      } else {
        // Update password to ensure it matches
        await queryMain(
          "UPDATE public.tenant_users SET password_hash = $1, status = 'active' WHERE tenant_id = $2 AND username = 'Admin'",
          [passwordHash, tenantId]
        );
        console.log('✅ Demo admin user password synced');
      }
    } catch (seedError) {
      console.warn('⚠️  Seed warning:', seedError.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
