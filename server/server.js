const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { connectDB, getDbStatus } = require('./config/db');
const checkoutRouter = require('./routes/checkout');
const consultRouter  = require('./routes/consult');
const { verifySmtpConnection, supabaseSmtpSettings } = require('./config/smtpConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/checkout', checkoutRouter);
app.use('/api/consult',  consultRouter);

// SMTP & Supabase Auth Status Endpoint
app.get('/api/auth/smtp-status', async (req, res) => {
  try {
    const smtpStatus = await verifySmtpConnection();
    res.json({
      success: smtpStatus.success,
      supabase: {
        projectUrl: process.env.SUPABASE_URL || 'https://mpdoybawxexjjrkkqfpv.supabase.co',
        configured: !!process.env.SUPABASE_URL
      },
      smtp: smtpStatus,
      supabaseSmtpSettings: {
        smtp_host: supabaseSmtpSettings.smtp_host,
        smtp_port: supabaseSmtpSettings.smtp_port,
        smtp_user: supabaseSmtpSettings.smtp_user,
        smtp_admin_email: supabaseSmtpSettings.smtp_admin_email,
        smtp_sender_name: supabaseSmtpSettings.smtp_sender_name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Laxmi Pharma E-Commerce Backend',
    database: getDbStatus() ? 'connected (MongoDB)' : 'in-memory fallback (MongoDB offline)',
    resendConfigured: !!(process.env.ORDER_RESEND_API_KEY || process.env.RESEND_API_KEY),
    orderEmail: process.env.ORDER_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    consultEmail: process.env.CONSULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    timestamp: new Date().toISOString()
  });
});

// Root API Welcome / Docs
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Laxmi Pharma Checkout API',
    endpoints: {
      'POST /api/checkout': 'Submit order details and trigger admin email',
      'GET /api/checkout/orders': 'List all processed orders',
      'POST /api/consult/callback': 'Submit consultation callback request',
      'GET /health': 'Check service status'
    }
  });
});

// Optionally serve static frontend from parent directory
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// Fallback error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  🚀 Laxmi Pharma Backend Server Running on Port ${PORT}`);
    console.log(`  🔗 Checkout API:    http://localhost:${PORT}/api/checkout`);
    console.log(`  📞 Consult API:     http://localhost:${PORT}/api/consult/callback`);
    console.log(`  🏥 Health Check:    http://localhost:${PORT}/health`);
    console.log(`  🛒 Orders To:       ${process.env.ORDER_ADMIN_EMAIL || process.env.ADMIN_EMAIL}`);
    console.log(`  💊 Consult Desk To: ${process.env.CONSULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
