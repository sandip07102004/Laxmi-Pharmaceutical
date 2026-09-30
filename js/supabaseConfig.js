/**
 * js/supabaseConfig.js - Client-Side Supabase Client Initialization
 * 
 * Securely initializes the Supabase client in the browser using the project URL
 * and anon public key. Supports passwordless Email OTP authentication.
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://mpdoybawxexjjrkkqfpv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZG95YmF3eGV4ampya2txZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTAxNzksImV4cCI6MjEwNDI2NjE3OX0.2ef1xbefhPB3zlhteRhXHiWmoFVssxPbKhQ_wX3HKAc';

  function initClient() {
    // window.supabase is provided by @supabase/supabase-js CDN bundle
    const createClient = window.supabase?.createClient;
    if (typeof createClient === 'function') {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'implicit',
          storage: window.localStorage
        }
      });
      window.supabaseClient = client;
      window.dispatchEvent(new CustomEvent('supabase:ready', { detail: { client } }));
      return client;
    }
    return null;
  }

  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.getSupabaseClient = function () {
    if (!window.supabaseClient) {
      initClient();
    }
    return window.supabaseClient;
  };

  // Attempt immediate initialization or defer until window load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClient);
  } else {
    initClient();
  }
})();
