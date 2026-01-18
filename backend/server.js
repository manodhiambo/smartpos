const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmartPOS API Server',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting SmartPOS Server...');
    
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Check and fix tenant schema if needed
    try {
      const { queryMain } = require('./config/database');
      const tenantResult = await queryMain('SELECT tenant_schema FROM public.tenants WHERE id = 1');
      
      if (tenantResult.rows.length > 0) {
        const tenantSchema = tenantResult.rows[0].tenant_schema;
        
        // Check if sales table exists
        const tableCheck = await queryMain(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'sales'
          )`,
          [tenantSchema]
        );

        if (!tableCheck.rows[0].exists) {
          console.log('⚠️  Tenant tables missing, creating them...');
          const { exec } = require('child_process');
          exec('node scripts/fix-tenant-schema.js', (error, stdout, stderr) => {
            if (error) {
              console.error('Failed to create tenant tables:', error);
            } else {
              console.log(stdout);
            }
          });
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not check tenant schema:', error.message);
    }

    // Test email service
    console.log('📧 Testing email service...');
    const emailService = require('./config/email');
    if (emailService.transporter) {
      console.log('✅ Email service configured');
    } else {
      console.log('⚠️  Email service not configured (optional)');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SmartPOS Server Running');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 Press CTRL+C to stop the server');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  const { closeAllPools } = require('./config/database');
  await closeAllPools();
  process.exit(0);
});

startServer();

module.exports = app;
