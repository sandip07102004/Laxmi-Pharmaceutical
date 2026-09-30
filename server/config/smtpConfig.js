/**
 * server/config/smtpConfig.js
 * 
 * Resend Custom SMTP Configuration for Laxmi Pharma & Supabase Auth Integration
 * 
 * SMTP Settings:
 * - Host: smtp.resend.com
 * - Port: 465 (SSL direct)
 * - User: resend
 * - Pass: Resend API Key (Configured via SMTP_PASS or RESEND_API_KEY environment variable)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  auth: {
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASS || process.env.RESEND_API_KEY || ''
  }
};

/**
 * Creates and returns a verified Nodemailer SMTP transport instance
 */
function createSmtpTransporter() {
  return nodemailer.createTransport(smtpConfig);
}

/**
 * Verifies live connectivity with Resend Custom SMTP
 * @returns {Promise<{success: boolean, message: string, details?: any}>}
 */
async function verifySmtpConnection() {
  const transporter = createSmtpTransporter();
  try {
    await transporter.verify();
    console.log(`[SMTP Service] ✅ Connected & Authenticated to Resend SMTP (${smtpConfig.host}:${smtpConfig.port}) successfully.`);
    return {
      success: true,
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      secure: smtpConfig.secure,
      message: 'Resend Custom SMTP connection verified successfully'
    };
  } catch (error) {
    console.error('[SMTP Service Error] ❌ Verification failed:', error.message);
    return {
      success: false,
      host: smtpConfig.host,
      port: smtpConfig.port,
      error: error.message
    };
  }
}

/**
 * Payload template for Supabase Auth Custom SMTP Management API / Dashboard
 */
const supabaseSmtpSettings = {
  smtp_admin_email: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
  smtp_sender_name: 'Laxmi Pharma',
  smtp_host: smtpConfig.host,
  smtp_port: smtpConfig.port,
  smtp_user: smtpConfig.auth.user,
  smtp_pass: smtpConfig.auth.pass,
  smtp_max_frequency: 60
};

module.exports = {
  smtpConfig,
  createSmtpTransporter,
  verifySmtpConnection,
  supabaseSmtpSettings
};
