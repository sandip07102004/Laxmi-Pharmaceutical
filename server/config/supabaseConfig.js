/**
 * server/config/supabaseConfig.js - Server-Side Supabase Client Initialization
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mpdoybawxexjjrkkqfpv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZG95YmF3eGV4ampya2txZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTAxNzksImV4cCI6MjEwNDI2NjE3OX0.2ef1xbefhPB3zlhteRhXHiWmoFVssxPbKhQ_wX3HKAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
