/**
 * js/authComponent.js - Supabase Confirm Email & Magic Link Authentication Component
 * Powered by Supabase Auth (@supabase/supabase-js) & Resend Custom SMTP
 * 
 * Features:
 * - Passwordless email confirmation & magic link authentication
 * - Name capture & user_metadata synchronization
 * - Automatic URL token detection & session establishment on confirmation link click
 * - Real-time session persistence & onAuthStateChange listener
 * - Seamless state sync across all pages & checkout components
 */

(function () {
  'use strict';

  // State
  let currentEmail = '';
  let currentName = '';
  let currentPhone = '';
  let resendTimer = null;
  let resendCountdown = 30;

  /**
   * Helper to retrieve initialized Supabase client
   */
  function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.getSupabaseClient === 'function') {
      return window.getSupabaseClient();
    }
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const url = window.SUPABASE_URL || 'https://mpdoybawxexjjrkkqfpv.supabase.co';
      const key = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZG95YmF3eGV4ampya2txZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTAxNzksImV4cCI6MjEwNDI2NjE3OX0.2ef1xbefhPB3zlhteRhXHiWmoFVssxPbKhQ_wX3HKAc';
      window.supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'implicit'
        }
      });
      return window.supabaseClient;
    }
    return null;
  }

  // Mode: 'signin' or 'signup'
  let currentAuthMode = 'signin';

  // DOM Elements Cache
  function getElements() {
    return {
      backdrop: document.getElementById('loginModalBackdrop'),
      closeBtn: document.getElementById('closeLoginModalBtn'),
      // Step 1: Email Form with Name, Password, Confirm Password & Mode Toggle
      stepEmail: document.getElementById('authStepEmail'),
      emailForm: document.getElementById('authEmailForm'),
      nameGroup: document.getElementById('authNameGroup'),
      nameInput: document.getElementById('authNameInput'),
      phoneGroup: document.getElementById('authPhoneGroup'),
      phoneInput: document.getElementById('authPhoneInput'),
      emailInput: document.getElementById('authEmailInput'),
      passwordInput: document.getElementById('authPasswordInput'),
      togglePasswordBtn: document.getElementById('authTogglePasswordBtn'),
      togglePasswordIcon: document.getElementById('authTogglePasswordIcon'),
      confirmPasswordGroup: document.getElementById('authConfirmPasswordGroup'),
      confirmPasswordInput: document.getElementById('authConfirmPasswordInput'),
      toggleConfirmPasswordBtn: document.getElementById('authToggleConfirmPasswordBtn'),
      toggleConfirmPasswordIcon: document.getElementById('authToggleConfirmPasswordIcon'),
      sendOtpBtn: document.getElementById('authSendOtpBtn'),
      sendBtnText: document.getElementById('authSendBtnText'),
      sendBtnIcon: document.getElementById('authSendBtnIcon'),
      emailAlert: document.getElementById('authEmailAlert'),
      modalTitle: document.getElementById('loginModalTitle'),
      modalSubtitle: document.getElementById('loginModalSubtitle'),
      modalIconSymbol: document.getElementById('authModalIconSymbol'),
      tabSignIn: document.getElementById('authTabSignIn'),
      tabSignUp: document.getElementById('authTabSignUp'),
      toggleModeBtn: document.getElementById('authToggleModeBtn'),
      toggleModeText: document.getElementById('authToggleModeText'),
      // Step 2: OTP Form
      stepOtp: document.getElementById('authStepOtp'),
      otpForm: document.getElementById('authOtpForm'),
      otpInput: document.getElementById('authOtpInput'),
      verifyOtpBtn: document.getElementById('authVerifyOtpBtn'),
      otpAlert: document.getElementById('authOtpAlert'),
      targetEmailText: document.getElementById('authTargetEmail'),
      backToEmailBtn: document.getElementById('authBackToEmailBtn'),
      resendOtpBtn: document.getElementById('authResendOtpBtn'),
      resendTimerText: document.getElementById('authResendTimerText'),
      // Step 3: Logged In View
      stepLoggedIn: document.getElementById('authStepLoggedIn'),
      userAvatar: document.getElementById('authUserAvatar'),
      userNameText: document.getElementById('authUserNameText'),
      userEmailText: document.getElementById('authUserEmailText'),
      userStatusText: document.getElementById('authUserStatusText'),
      signOutBtn: document.getElementById('authSignOutBtn'),
      deleteAccountBtn: document.getElementById('authDeleteAccountBtn'),
      continueBtn: document.getElementById('authContinueBtn')
    };
  }

  /**
   * Set Auth Mode: 'signin' or 'signup'
   */
  function setAuthMode(mode = 'signin') {
    currentAuthMode = mode === 'signup' ? 'signup' : 'signin';
    const els = getElements();

    if (els.tabSignIn) {
      els.tabSignIn.classList.toggle('active', currentAuthMode === 'signin');
    }
    if (els.tabSignUp) {
      els.tabSignUp.classList.toggle('active', currentAuthMode === 'signup');
    }

    if (currentAuthMode === 'signup') {
      if (els.modalTitle) els.modalTitle.textContent = 'Create Patient Account';
      if (els.modalSubtitle) els.modalSubtitle.textContent = 'Enter your full name, phone number, email and password to create your patient account.';
      if (els.modalIconSymbol) els.modalIconSymbol.textContent = 'person_add';
      if (els.sendBtnText) els.sendBtnText.textContent = 'Create Account';
      if (els.sendBtnIcon) els.sendBtnIcon.textContent = 'person_add';
      if (els.toggleModeText) els.toggleModeText.textContent = 'Already have an account?';
      if (els.toggleModeBtn) els.toggleModeBtn.textContent = 'Sign In';
      if (els.nameGroup) els.nameGroup.style.display = 'block';
      if (els.nameInput) els.nameInput.required = true;
      if (els.phoneGroup) els.phoneGroup.style.display = 'block';
      if (els.phoneInput) els.phoneInput.required = true;
      if (els.confirmPasswordGroup) els.confirmPasswordGroup.style.display = 'block';
      if (els.confirmPasswordInput) els.confirmPasswordInput.required = true;
    } else {
      if (els.modalTitle) els.modalTitle.textContent = 'Sign In to Laxmi Pharma';
      if (els.modalSubtitle) els.modalSubtitle.textContent = 'Enter your email address and password to access your patient account.';
      if (els.modalIconSymbol) els.modalIconSymbol.textContent = 'lock';
      if (els.sendBtnText) els.sendBtnText.textContent = 'Sign In';
      if (els.sendBtnIcon) els.sendBtnIcon.textContent = 'login';
      if (els.toggleModeText) els.toggleModeText.textContent = 'New patient?';
      if (els.toggleModeBtn) els.toggleModeBtn.textContent = 'Create Account';
      if (els.nameGroup) els.nameGroup.style.display = 'none';
      if (els.nameInput) {
        els.nameInput.required = false;
        els.nameInput.value = '';
      }
      if (els.phoneGroup) els.phoneGroup.style.display = 'none';
      if (els.phoneInput) {
        els.phoneInput.required = false;
        els.phoneInput.value = '';
      }
      if (els.confirmPasswordGroup) els.confirmPasswordGroup.style.display = 'none';
      if (els.confirmPasswordInput) {
        els.confirmPasswordInput.required = false;
        els.confirmPasswordInput.value = '';
      }
    }

    hideAlert(els.emailAlert);
  }

  /**
   * Display contextual alerts inside auth views
   */
  function showAlert(alertEl, message, type = 'error') {
    if (!alertEl) return;
    alertEl.className = `auth-alert auth-alert-${type}`;
    const iconName = type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'error';
    alertEl.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">${iconName}</span>
      <span>${message}</span>
    `;
    alertEl.style.display = 'flex';
  }

  function hideAlert(alertEl) {
    if (!alertEl) return;
    alertEl.style.display = 'none';
    alertEl.innerHTML = '';
  }

  /**
   * Set loading state on a button
   */
  function setBtnLoading(btn, isLoading, defaultHtml) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `
        <span class="auth-btn-spinner"></span>
        <span>Sending...</span>
      `;
    } else {
      btn.innerHTML = btn.dataset.originalHtml || defaultHtml;
    }
  }

  /**
   * Step Switching: 'email', 'otp', or 'loggedIn'
   */
  function switchAuthStep(step) {
    const els = getElements();
    if (els.stepEmail) els.stepEmail.style.display = step === 'email' ? 'block' : 'none';
    if (els.stepOtp) els.stepOtp.style.display = step === 'otp' ? 'block' : 'none';
    if (els.stepLoggedIn) els.stepLoggedIn.style.display = step === 'loggedIn' ? 'block' : 'none';

    // Clear alerts on step change
    hideAlert(els.emailAlert);
    hideAlert(els.otpAlert);

    if (step === 'email') {
      const storedEmail = localStorage.getItem('laxmi_supabase_email') || '';
      if (els.emailInput && !els.emailInput.value && storedEmail) els.emailInput.value = storedEmail;
      if (els.passwordInput) els.passwordInput.value = '';
      if (els.confirmPasswordInput) els.confirmPasswordInput.value = '';
      setTimeout(() => {
        if (currentAuthMode === 'signup' && els.nameInput && !els.nameInput.value) {
          els.nameInput.focus();
        } else if (els.emailInput && !els.emailInput.value) {
          els.emailInput.focus();
        } else if (els.passwordInput) {
          els.passwordInput.focus();
        }
      }, 150);
    } else if (step === 'otp' && els.otpInput) {
      els.otpInput.value = '';
      setTimeout(() => els.otpInput.focus(), 150);
    }
  }

  /**
   * Resend Countdown Timer
   */
  function startResendCooldown() {
    const els = getElements();
    if (!els.resendOtpBtn || !els.resendTimerText) return;

    clearInterval(resendTimer);
    resendCountdown = 30;
    els.resendOtpBtn.disabled = true;
    els.resendOtpBtn.style.pointerEvents = 'none';
    els.resendOtpBtn.style.opacity = '0.5';
    els.resendTimerText.textContent = `(${resendCountdown}s)`;
    els.resendTimerText.style.display = 'inline';

    resendTimer = setInterval(() => {
      resendCountdown -= 1;
      if (resendCountdown <= 0) {
        clearInterval(resendTimer);
        els.resendOtpBtn.disabled = false;
        els.resendOtpBtn.style.pointerEvents = 'auto';
        els.resendOtpBtn.style.opacity = '1';
        els.resendTimerText.style.display = 'none';
      } else {
        els.resendTimerText.textContent = `(${resendCountdown}s)`;
      }
    }, 1000);
  }

  /**
   * 1. Submit Auth Form (Email + Password for Sign In or Full Name, Email, Password, Confirm Password for Sign Up)
   */
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    const els = getElements();
    const name = els.nameInput ? els.nameInput.value.trim() : '';
    const phone = els.phoneInput ? els.phoneInput.value.trim() : '';
    const email = els.emailInput ? els.emailInput.value.trim() : '';
    const password = els.passwordInput ? els.passwordInput.value : '';
    const confirmPassword = els.confirmPasswordInput ? els.confirmPasswordInput.value : '';

    hideAlert(els.emailAlert);

    const isSignUp = currentAuthMode === 'signup';

    // Full Name check (for Sign Up)
    if (isSignUp && !name) {
      showAlert(els.emailAlert, 'Please enter your full name.', 'error');
      if (els.nameInput) els.nameInput.focus();
      return;
    }

    // Phone number validation (for Sign Up)
    if (isSignUp && phone) {
      const phoneCheck = (typeof window.validateIndianMobile === 'function') ? window.validateIndianMobile(phone) : null;
      if (phoneCheck && !phoneCheck.isValid) {
        showAlert(els.emailAlert, phoneCheck.error || 'Please enter a valid 10-digit Indian mobile number.', 'error');
        if (els.phoneInput) els.phoneInput.focus();
        return;
      }
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showAlert(els.emailAlert, 'Please enter a valid email address (e.g. name@example.com).', 'error');
      if (els.emailInput) els.emailInput.focus();
      return;
    }

    // Password check
    if (!password || password.length < 6) {
      showAlert(els.emailAlert, 'Please enter a password with at least 6 characters.', 'error');
      if (els.passwordInput) els.passwordInput.focus();
      return;
    }

    // Re-enter Password check (for Sign Up)
    if (isSignUp) {
      if (!confirmPassword) {
        showAlert(els.emailAlert, 'Please re-enter your password in the confirmation field.', 'error');
        if (els.confirmPasswordInput) els.confirmPasswordInput.focus();
        return;
      }
      if (password !== confirmPassword) {
        showAlert(els.emailAlert, 'Passwords do not match. Please ensure both passwords match.', 'error');
        if (els.confirmPasswordInput) els.confirmPasswordInput.focus();
        return;
      }
    }

    const supabase = getClient();
    if (!supabase) {
      showAlert(els.emailAlert, 'Supabase Auth service is initializing. Please try again in a moment.', 'warning');
      return;
    }

    const actionLabel = isSignUp ? 'Create Account' : 'Sign In';
    setBtnLoading(els.sendOtpBtn, true, actionLabel);

    try {
      currentEmail = email;

      if (isSignUp) {
        // Sign Up with Full Name, Email and Password
        const displayName = name || email.split('@')[0].replace(/[._-]/g, ' ');
        localStorage.setItem('laxmi_supabase_user_name', displayName);
        currentPhone = phone;

        // Normalize phone for metadata
        let normalizedPhone = phone;
        if (phone && typeof window.validateIndianMobile === 'function') {
          const phoneResult = window.validateIndianMobile(phone);
          if (phoneResult.isValid) normalizedPhone = phoneResult.formatted || phoneResult.normalized || phone;
        }
        if (normalizedPhone) localStorage.setItem('laxmi_supabase_user_phone', normalizedPhone);

        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: displayName,
              full_name: displayName,
              phone: normalizedPhone || ''
            }
          }
        });

        if (error) {
          console.error('[Supabase signUp Error]', error);
          showAlert(els.emailAlert, error.message || 'Failed to create account. Please try again.', 'error');
        } else if (data && data.session && data.session.user) {
          // Instant session
          updateUserState(data.session.user);
          closeLoginModal();
          showToast('Account created and signed in successfully!', 'verified');
        } else if (data && data.user) {
          // Confirmation email required
          showAlert(els.emailAlert, `Account created for ${email}! Please check your email to verify your account, or sign in now.`, 'success');
          showToast('Account created! Please check your inbox.', 'mail');
          setAuthMode('signin');
        } else {
          showAlert(els.emailAlert, 'Account registered. Please proceed to sign in.', 'success');
          setAuthMode('signin');
        }
      } else {
        // Sign In with Email and Password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          console.error('[Supabase signInWithPassword Error]', error);
          showAlert(els.emailAlert, error.message || 'Invalid email or password. Please verify and try again.', 'error');
        } else if (data && data.session && data.session.user) {
          updateUserState(data.session.user);
          closeLoginModal();
          showToast('Signed in successfully!', 'verified');
        } else if (data && data.user) {
          updateUserState(data.user);
          closeLoginModal();
          showToast('Signed in successfully!', 'verified');
        }
      }
    } catch (err) {
      console.error('[Supabase Auth Exception]', err);
      showAlert(els.emailAlert, 'An unexpected network error occurred. Please try again.', 'error');
    } finally {
      setBtnLoading(els.sendOtpBtn, false, actionLabel);
    }
  }

  /**
   * 2. Verify 6-digit Code (verifyOtp)
   * Supports both 'email' and 'signup' OTP types for seamless login & registration
   */
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    const els = getElements();
    const token = els.otpInput ? els.otpInput.value.trim() : '';

    hideAlert(els.otpAlert);

    if (!token || token.length < 6) {
      showAlert(els.otpAlert, 'Please enter the complete 6-digit numeric code.', 'error');
      if (els.otpInput) els.otpInput.focus();
      return;
    }

    const supabase = getClient();
    if (!supabase) {
      showAlert(els.otpAlert, 'Supabase Auth service is unavailable. Please refresh the page.', 'error');
      return;
    }

    setBtnLoading(els.verifyOtpBtn, true, 'Verify Code & Sign In');

    try {
      // First attempt: type 'email' (for existing/confirmed users and magic OTPs)
      let verifyResult = await supabase.auth.verifyOtp({
        email: currentEmail,
        token: token,
        type: 'email'
      });

      // Second attempt: if type 'email' failed, attempt type 'signup' (for first-time email confirmations)
      if (verifyResult.error) {
        const signupResult = await supabase.auth.verifyOtp({
          email: currentEmail,
          token: token,
          type: 'signup'
        });
        if (!signupResult.error) {
          verifyResult = signupResult;
        }
      }

      if (verifyResult.error) {
        console.error('[Supabase verifyOtp Error]', verifyResult.error);
        if (verifyResult.error.message && verifyResult.error.message.toLowerCase().includes('expired')) {
          showAlert(els.otpAlert, 'This verification code has expired. Please click "Resend Code" to get a fresh code.', 'error');
        } else {
          showAlert(els.otpAlert, verifyResult.error.message || 'Invalid verification code. Please double check and try again.', 'error');
        }
      } else if (verifyResult.data && verifyResult.data.session) {
        // Success
        showAlert(els.otpAlert, 'Signed in successfully! Loading your profile...', 'success');
        showToast('Signed in successfully!', 'verified');
        updateUserState(verifyResult.data.session.user);

        setTimeout(() => {
          switchAuthStep('loggedIn');
        }, 600);
      }
    } catch (err) {
      console.error('[Supabase verifyOtp Exception]', err);
      showAlert(els.otpAlert, 'Verification failed due to a network issue. Please try again.', 'error');
    } finally {
      setBtnLoading(els.verifyOtpBtn, false, 'Verify Code & Sign In');
    }
  }

  /**
   * 3. Resend OTP
   */
  async function handleResendOtp() {
    if (!currentEmail) {
      switchAuthStep('email');
      return;
    }

    const els = getElements();
    const supabase = getClient();
    if (!supabase) return;

    hideAlert(els.otpAlert);
    if (els.resendOtpBtn) els.resendOtpBtn.disabled = true;

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
          data: {
            full_name: currentName || localStorage.getItem('laxmi_supabase_user_name') || '',
            name: currentName || localStorage.getItem('laxmi_supabase_user_name') || ''
          }
        }
      });

      if (error) {
        showAlert(els.otpAlert, error.message || 'Could not resend link. Please try again shortly.', 'error');
      } else {
        showAlert(els.otpAlert, `New sign-in link sent to ${currentEmail}. Check your inbox or spam folder.`, 'success');
        startResendCooldown();
        showToast('New sign-in link sent to your inbox', 'mail');
      }
    } catch (err) {
      showAlert(els.otpAlert, 'Failed to resend link due to network error.', 'error');
    }
  }

  /**
   * Open / Close Login Modal Helpers
   */
  function openLoginModal(modeOrStep = null) {
    const els = getElements();
    if (!els.backdrop) return;
    const isStoredLoggedIn = localStorage.getItem('laxmi_supabase_logged_in') === 'true';

    if (modeOrStep === 'signup') {
      setAuthMode('signup');
      switchAuthStep('email');
    } else if (modeOrStep === 'signin') {
      setAuthMode('signin');
      switchAuthStep('email');
    } else if (modeOrStep === 'email' || modeOrStep === 'otp' || modeOrStep === 'loggedIn') {
      switchAuthStep(modeOrStep);
    } else {
      setAuthMode('signin');
      switchAuthStep(isStoredLoggedIn ? 'loggedIn' : 'email');
    }

    els.backdrop.style.display = 'flex';
    requestAnimationFrame(() => {
      els.backdrop.classList.add('open');
    });
    document.body.style.overflow = 'hidden';
  }

  function closeLoginModal() {
    const els = getElements();
    if (!els.backdrop) return;
    els.backdrop.classList.remove('open');
    setTimeout(() => {
      els.backdrop.style.display = 'none';
      document.body.style.overflow = '';
    }, 250);
  }

  /**
   * 4. Sign Out Confirmation & Execution
   */
  function ensureSignOutConfirmModal() {
    let backdrop = document.getElementById('signOutConfirmBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'signOutConfirmBackdrop';
      backdrop.className = 'auth-modal-backdrop signout-confirm-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'signOutConfirmTitle');
      backdrop.style.display = 'none';

      backdrop.innerHTML = `
        <div class="auth-modal-card signout-confirm-card" style="max-width: 410px; width: 100%; text-align: center; padding: 28px 24px; position: relative; border-radius: 20px; box-shadow: 0 24px 60px -12px rgba(0, 45, 41, 0.35); border: 1px solid rgba(0, 92, 85, 0.1);">
          <button type="button" class="auth-modal-close" id="closeSignOutConfirmBtn" aria-label="Close confirmation dialog" style="position: absolute; top: 16px; right: 16px; width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--color-surface-container-low, #f1f5f9); color: var(--color-outline, #64748b); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
          
          <div style="width: 58px; height: 58px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 4px auto 16px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.18);">
            <span class="material-symbols-outlined text-[30px]">logout</span>
          </div>
          
          <h3 id="signOutConfirmTitle" style="font-size: 1.25rem; font-weight: 700; color: var(--color-on-surface, #0f172a); margin: 0 0 8px;">
            Sign Out of Your Account?
          </h3>
          
          <p style="font-size: 0.9rem; color: var(--color-on-surface-variant, #64748b); line-height: 1.55; margin: 0 0 24px;">
            Are you sure you want to sign out? You will need to sign in again to access your chronic refills, personal adherence tracker, and saved prescriptions.
          </p>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button type="button" class="btn btn-outline" id="cancelSignOutBtn" style="flex: 1; justify-content: center; border-radius: 10px; font-weight: 600; padding: 10px 16px; font-size: 0.92rem; border-color: var(--color-outline-variant, #cbd5e1); color: var(--color-on-surface, #334155); background: #ffffff;">
              Stay Signed In
            </button>
            <button type="button" class="btn btn-danger" id="confirmSignOutBtn" style="flex: 1; justify-content: center; border-radius: 10px; font-weight: 600; padding: 10px 16px; font-size: 0.92rem; background: #dc2626; border: 1px solid #dc2626; color: #ffffff; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25); display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
    }

    if (!backdrop._listenersAttached) {
      backdrop._listenersAttached = true;
      const closeBtn = backdrop.querySelector('#closeSignOutConfirmBtn');
      const cancelBtn = backdrop.querySelector('#cancelSignOutBtn');
      const confirmBtn = backdrop.querySelector('#confirmSignOutBtn');

      if (closeBtn) closeBtn.addEventListener('click', closeSignOutConfirmModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeSignOutConfirmModal);
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          closeSignOutConfirmModal();
          await executeSignOut();
        });
      }

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeSignOutConfirmModal();
        }
      });
    }

    return backdrop;
  }

  function openSignOutConfirmModal() {
    const backdrop = ensureSignOutConfirmModal();
    if (!backdrop) return;

    // Close main auth modal if open
    const els = getElements();
    if (els.backdrop && els.backdrop.classList.contains('open')) {
      els.backdrop.classList.remove('open');
      els.backdrop.style.display = 'none';
    }

    backdrop.style.display = 'flex';
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeSignOutConfirmModal() {
    const backdrop = document.getElementById('signOutConfirmBackdrop');
    if (!backdrop) return;

    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      backdrop.style.display = 'none';
      const loginBackdrop = document.getElementById('loginModalBackdrop');
      if (!loginBackdrop || !loginBackdrop.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }, 250);
  }

  /**
   * Actual Sign Out Execution
   */
  async function executeSignOut() {
    const supabase = getClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }

    currentEmail = '';
    currentName = '';
    currentPhone = '';
    updateUserState(null);
    setAuthMode('signin');
    switchAuthStep('email');
    showToast('Signed out of your account.', 'logout');
  }

  /**
   * Sign Out Handler: Prompts Confirmation Popup Window
   */
  function handleSignOut(skipConfirm = false) {
    if (skipConfirm === true) {
      return executeSignOut();
    }
    openSignOutConfirmModal();
  }

  /**
   * 5. Delete Account Confirmation & Permanent Database Erasure
   */
  function ensureDeleteAccountConfirmModal() {
    let backdrop = document.getElementById('deleteAccountConfirmBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'deleteAccountConfirmBackdrop';
      backdrop.className = 'auth-modal-backdrop delete-confirm-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'deleteAccountConfirmTitle');
      backdrop.style.display = 'none';

      backdrop.innerHTML = `
        <div class="auth-modal-card delete-confirm-card" style="max-width: 420px; width: 100%; text-align: center; padding: 28px 24px; position: relative; border-radius: 20px; box-shadow: 0 24px 60px -12px rgba(153, 27, 27, 0.35); border: 1px solid rgba(220, 38, 38, 0.2);">
          <button type="button" class="auth-modal-close" id="closeDeleteAccountConfirmBtn" aria-label="Close confirmation dialog" style="position: absolute; top: 16px; right: 16px; width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--color-surface-container-low, #f1f5f9); color: var(--color-outline, #64748b); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
          
          <div style="width: 58px; height: 58px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 4px auto 16px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.2);">
            <span class="material-symbols-outlined text-[32px]">delete_forever</span>
          </div>
          
          <h3 id="deleteAccountConfirmTitle" style="font-size: 1.25rem; font-weight: 700; color: #991b1b; margin: 0 0 12px;">
            Permanently Delete Account?
          </h3>
          
          <p style="font-size: 0.92rem; color: var(--color-on-surface-variant, #64748b); line-height: 1.5; margin: 0 0 24px;">
            Are you absolutely sure you want to erase all data and delete your account?
          </p>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button type="button" class="btn btn-outline" id="cancelDeleteAccountBtn" style="flex: 1; justify-content: center; border-radius: 10px; font-weight: 600; padding: 10px 16px; font-size: 0.92rem; border-color: var(--color-outline-variant, #cbd5e1); color: var(--color-on-surface, #334155); background: #ffffff;">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" id="confirmDeleteAccountBtn" style="flex: 1.2; justify-content: center; border-radius: 10px; font-weight: 600; padding: 10px 16px; font-size: 0.92rem; background: #dc2626; border: 1px solid #dc2626; color: #ffffff; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3); display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-symbols-outlined text-[18px]">delete_forever</span>
              <span>Delete Forever</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
    }

    if (!backdrop._listenersAttached) {
      backdrop._listenersAttached = true;
      const closeBtn = backdrop.querySelector('#closeDeleteAccountConfirmBtn');
      const cancelBtn = backdrop.querySelector('#cancelDeleteAccountBtn');
      const confirmBtn = backdrop.querySelector('#confirmDeleteAccountBtn');

      if (closeBtn) closeBtn.addEventListener('click', closeDeleteAccountConfirmModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteAccountConfirmModal);
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]" style="animation: spin 1s linear infinite;">progress_activity</span> Erasing Data...';
          const success = await executeDeleteAccount();
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete_forever</span><span>Delete Everything</span>';
          if (success) {
            closeDeleteAccountConfirmModal();
          }
        });
      }

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeDeleteAccountConfirmModal();
        }
      });
    }

    return backdrop;
  }

  function openDeleteAccountConfirmModal() {
    const backdrop = ensureDeleteAccountConfirmModal();
    if (!backdrop) return;

    // Close main login modal if open
    const els = getElements();
    if (els.backdrop && els.backdrop.classList.contains('open')) {
      els.backdrop.classList.remove('open');
      els.backdrop.style.display = 'none';
    }

    backdrop.style.display = 'flex';
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeDeleteAccountConfirmModal() {
    const backdrop = document.getElementById('deleteAccountConfirmBackdrop');
    if (!backdrop) return;

    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      backdrop.style.display = 'none';
      const loginBackdrop = document.getElementById('loginModalBackdrop');
      if (!loginBackdrop || !loginBackdrop.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }, 250);
  }

  async function executeDeleteAccount() {
    const supabase = getClient();
    if (!supabase) {
      showToast('Database connection unavailable.', 'error');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('delete_user_account');
      if (error) {
        console.error('[Auth] Error executing delete_user_account:', error);
        showToast('Error deleting account: ' + (error.message || 'Please try again'), 'error');
        return false;
      }
    } catch (err) {
      console.error('[Auth] Exception deleting account:', err);
      showToast('Error deleting account: ' + err.message, 'error');
      return false;
    }

    // Sign out to revoke token and clean client cookies
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    // Wipe all user local storage and cookies
    try {
      localStorage.removeItem('laxmi_supabase_user_name');
      localStorage.removeItem('laxmi_supabase_user_phone');
      localStorage.removeItem('laxmi_user_name');
      localStorage.removeItem('laxmi_user_email');
      localStorage.removeItem('laxmi_user_phone');
      localStorage.removeItem('laxmi_user_address');
      localStorage.removeItem('laxmi_user_cart');
      localStorage.removeItem('laxmi_cart');
      localStorage.removeItem('laxmi_refill_streak');

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}

    currentEmail = '';
    currentName = '';
    currentPhone = '';
    updateUserState(null);
    setAuthMode('signin');
    switchAuthStep('email');

    showToast('Your account and all data have been permanently erased.', 'delete_forever');

    // Trigger refills refresh if on refills page
    if (window.RefillsManager && typeof window.RefillsManager.init === 'function') {
      window.RefillsManager.init();
    }

    return true;
  }

  /**
   * Update UI badges, profile card, popover window, and global state based on Supabase user
   */
  function updateUserState(user) {
    const els = getElements();
    const isLoggedIn = !!user;
    const email = user?.email || '';

    // Retrieve phone from user_metadata or localStorage
    const metaPhone = user?.user_metadata?.phone || '';
    const storedPhone = localStorage.getItem('laxmi_supabase_user_phone') || '';
    const displayPhone = metaPhone || storedPhone || '';

    // Retrieve name from user_metadata or localStorage
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    const storedName = localStorage.getItem('laxmi_supabase_user_name') || '';
    const rawName = metaName || storedName || (email ? email.split('@')[0] : '');

    // Format name with capital casing
    let displayName = 'User';
    if (rawName) {
      displayName = rawName
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    } else if (email) {
      displayName = email.split('@')[0];
    }

    // Generate single first-letter initial (e.g. "Sandip" -> "S", "Sandip Kumar" -> "S")
    const initials = (displayName.trim().charAt(0) || email.trim().charAt(0) || 'U').toUpperCase();

    // Store in localStorage for fast instant sync
    if (isLoggedIn) {
      localStorage.setItem('laxmi_supabase_logged_in', 'true');
      localStorage.setItem('laxmi_supabase_email', email);
      localStorage.setItem('laxmi_supabase_user_name', displayName);
      if (displayPhone) localStorage.setItem('laxmi_supabase_user_phone', displayPhone);
    } else {
      localStorage.removeItem('laxmi_supabase_logged_in');
      localStorage.removeItem('laxmi_supabase_email');
      localStorage.removeItem('laxmi_supabase_user_name');
      localStorage.removeItem('laxmi_supabase_user_phone');
    }

    // Update Modal Logged-In Card
    if (els.userAvatar) els.userAvatar.textContent = initials;
    if (els.userNameText) els.userNameText.textContent = displayName;
    if (els.userEmailText) els.userEmailText.textContent = email;
    if (els.userStatusText) els.userStatusText.textContent = 'Active Patient Session · Supabase Auth Verified';

    // Update Small Profile Popover Window
    const loggedInViews = document.querySelectorAll('#popoverLoggedInView');
    loggedInViews.forEach(v => {
      v.style.display = isLoggedIn ? 'block' : 'none';
    });

    const loggedOutViews = document.querySelectorAll('#popoverLoggedOutView');
    loggedOutViews.forEach(v => {
      v.style.display = isLoggedIn ? 'none' : 'block';
    });

    const popoverAvatars = document.querySelectorAll('#popoverAvatar');
    popoverAvatars.forEach(a => {
      a.textContent = initials;
    });

    const popoverNames = document.querySelectorAll('#popoverName');
    popoverNames.forEach(n => {
      n.textContent = displayName;
    });

    const popoverEmailTexts = document.querySelectorAll('#popoverEmailText, #popoverEmailValue');
    popoverEmailTexts.forEach(e => {
      e.textContent = email || 'user@example.com';
    });

    const popoverEmails = document.querySelectorAll('#popoverEmail');
    popoverEmails.forEach(e => {
      e.style.display = email ? 'flex' : 'none';
    });

    const popoverPhoneTexts = document.querySelectorAll('#popoverPhoneText, #popoverPhoneValue');
    popoverPhoneTexts.forEach(p => {
      p.textContent = displayPhone || 'Not Provided';
    });

    const popoverPhones = document.querySelectorAll('#popoverPhone');
    popoverPhones.forEach(p => {
      p.style.display = displayPhone ? 'flex' : 'none';
    });


    // Update Navbar User Button across pages
    const navLoginBtns = document.querySelectorAll('.nav-user-btn, .nav-action-btn[data-action="login"], #navAccountBtn');
    navLoginBtns.forEach((btn) => {
      const nameEl = btn.querySelector('.nav-user-name');
      const avatarEl = btn.querySelector('.nav-user-avatar');

      if (isLoggedIn) {
        btn.classList.add('logged-in');
        btn.setAttribute('title', `${displayName} (${email}) · Profile & Account`);
        btn.setAttribute('aria-label', `${displayName} Profile Menu`);
        if (nameEl) nameEl.textContent = displayName.split(' ')[0] || displayName;
        if (avatarEl) avatarEl.textContent = initials;
      } else {
        btn.classList.remove('logged-in');
        btn.setAttribute('title', 'Sign In / Profile & Account');
        btn.setAttribute('aria-label', 'Sign In / Profile & Account');
        if (nameEl) nameEl.textContent = 'Profile';
        if (avatarEl) {
          avatarEl.innerHTML = '<svg id="navUserIcon" width="20" height="20" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="33" r="11"/><path d="M 28 66 C 28 54 36 50 50 50 C 64 50 72 54 72 66 Z"/></svg>';
        }
      }
    });

    // Notify other components (cart, checkout, prescriptions, etc.)
    window.dispatchEvent(new CustomEvent('laxmi:auth:state', {
      detail: { user, isLoggedIn, email, name: displayName, initials, phone: displayPhone }
    }));
  }

  /**
   * Initialize Small Profile Window Popover
   */
  let isProfilePopoverInitialized = false;
  function initProfilePopover() {
    if (isProfilePopoverInitialized) return;
    isProfilePopoverInitialized = true;

    const containers = document.querySelectorAll('.nav-user-container');
    const popovers = document.querySelectorAll('.profile-popover');

    // Toggle popover on navbar user button click
    document.querySelectorAll('.nav-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const container = btn.closest('.nav-user-container');
        const popover = container ? container.querySelector('.profile-popover') : document.getElementById('profilePopover');
        if (!popover) return;

        const isOpen = popover.classList.contains('open');

        // Close all popovers first
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

        if (!isOpen) {
          popover.classList.add('open');
          popover.setAttribute('aria-hidden', 'false');
          if (container) container.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');

          // Ensure profile popover is perfectly constrained within the viewport with safe margins
          adjustPopoverPosition(popover);
        }
      });
    });

    // Ensure an explicit close button is present in every profile popover (for web & mobile)
    popovers.forEach(popover => {
      if (!popover.querySelector('.popover-close-btn')) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'popover-close-btn';
        closeBtn.setAttribute('aria-label', 'Close Profile');
        closeBtn.setAttribute('title', 'Close');
        closeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">close</span>';
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          popover.classList.remove('open');
          popover.setAttribute('aria-hidden', 'true');
          popover.style.right = '';
          popover.style.left = '';
          containers.forEach(c => c.classList.remove('open'));
          document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        });
        popover.appendChild(closeBtn);
      }
    });

    // Dynamically constrain popover within viewport margins to prevent right or left cut-offs
    function adjustPopoverPosition(popover) {
      if (!popover) return;
      popover.style.right = '';
      popover.style.left = '';

      const rect = popover.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const safeMargin = 14;

      if (rect.right > viewportWidth - safeMargin) {
        const excess = rect.right - (viewportWidth - safeMargin);
        const computedRight = parseFloat(window.getComputedStyle(popover).right) || 0;
        popover.style.right = `${computedRight + excess}px`;
      }

      const updatedRect = popover.getBoundingClientRect();
      if (updatedRect.left < safeMargin) {
        popover.style.left = `${safeMargin}px`;
        popover.style.right = 'auto';
      }
    }

    // Auto-close profile popover whenever the user scrolls or drags the screen on Web & Mobile
    const handleScrollClose = () => {
      let anyOpen = false;
      popovers.forEach(p => {
        if (p.classList.contains('open')) {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
          p.style.right = '';
          p.style.left = '';
          anyOpen = true;
        }
      });
      if (anyOpen) {
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      }
    };

    window.addEventListener('scroll', handleScrollClose, { capture: true, passive: true });
    document.addEventListener('scroll', handleScrollClose, { capture: true, passive: true });
    window.addEventListener('wheel', handleScrollClose, { passive: true });
    window.addEventListener('touchmove', handleScrollClose, { passive: true });

    // Close when clicking outside of nav-user-container
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-user-container') && !e.target.closest('.popover-close-btn')) {
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
          p.style.right = '';
          p.style.left = '';
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        popovers.forEach(p => {
          if (p.classList.contains('open')) {
            p.classList.remove('open');
            p.setAttribute('aria-hidden', 'true');
            p.style.right = '';
            p.style.left = '';
          }
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        const deleteBackdrop = document.getElementById('deleteAccountConfirmBackdrop');
        if (deleteBackdrop && deleteBackdrop.classList.contains('open')) {
          closeDeleteAccountConfirmModal();
          return;
        }
        const confirmBackdrop = document.getElementById('signOutConfirmBackdrop');
        if (confirmBackdrop && confirmBackdrop.classList.contains('open')) {
          closeSignOutConfirmModal();
          return;
        }
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      }
    });

    // Handle "Sign In" button inside popover logged-out card
    document.querySelectorAll('#popoverSignInTrigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close popover
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

        // Open modal in Sign In mode
        openLoginModal('signin');
      });
    });

    // Handle "Sign Up" button inside popover logged-out card
    document.querySelectorAll('#popoverSignUpTrigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close popover
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

        // Open modal in Sign Up mode
        openLoginModal('signup');
      });
    });

    // Handle Sign Out inside popover
    document.querySelectorAll('#popoverLogoutBtn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close popover
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

        await handleSignOut();
      });
    });

    // Handle Delete Account inside popover
    document.querySelectorAll('#popoverDeleteAccountBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close popover
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

        openDeleteAccountConfirmModal();
      });
    });

    // Close popover when clicking any link inside it
    document.querySelectorAll('.profile-popover a').forEach(link => {
      link.addEventListener('click', () => {
        popovers.forEach(p => {
          p.classList.remove('open');
          p.setAttribute('aria-hidden', 'true');
        });
        containers.forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.nav-user-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      });
    });
  }

  /**
   * Toast Notification Helper
   */
  function showToast(message, icon = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, icon);
      return;
    }
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /**
   * Connect Supabase Auth Session & Auth State Change Listeners
   */
  let isUIInitialized = false;
  let isSupabaseConnected = false;

  function connectSupabaseAuth() {
    if (isSupabaseConnected) return;
    const supabase = getClient();
    if (!supabase) {
      window.addEventListener('supabase:ready', () => {
        connectSupabaseAuth();
      }, { once: true });
      return;
    }
    isSupabaseConnected = true;

    const isStoredLoggedIn = localStorage.getItem('laxmi_supabase_logged_in') === 'true';

    // Check existing session from Supabase client
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        updateUserState(session.user);
        switchAuthStep('loggedIn');
      } else if (!isStoredLoggedIn) {
        updateUserState(null);
        switchAuthStep('email');
      }
    }).catch(err => {
      console.warn('Session check failed:', err);
    });

    // Listen for auth state changes (including token hash in URL if user clicked email confirmation link)
    supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        updateUserState(session.user);
        switchAuthStep('loggedIn');
        if (event === 'SIGNED_IN') {
          showToast('Signed in successfully via email link!', 'verified');
        }
        // Clean URL hash/params so token does not linger in browser history
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        updateUserState(null);
      }
    });
  }

  /**
   * Initialize Listeners & Check Session
   */
  function initAuthComponent() {
    if (!isUIInitialized) {
      isUIInitialized = true;
      const els = getElements();

      // Check cached session on startup for instant UI responsiveness
      const storedEmail = localStorage.getItem('laxmi_supabase_email');
      const storedName = localStorage.getItem('laxmi_supabase_user_name');
      const isStoredLoggedIn = localStorage.getItem('laxmi_supabase_logged_in') === 'true';
      if (isStoredLoggedIn && storedEmail) {
        updateUserState({
          email: storedEmail,
          user_metadata: { full_name: storedName, name: storedName }
        });
      } else {
        updateUserState(null);
      }

      // Modal Tabs & Mode Toggle
      if (els.tabSignIn) {
        els.tabSignIn.addEventListener('click', () => setAuthMode('signin'));
      }
      if (els.tabSignUp) {
        els.tabSignUp.addEventListener('click', () => setAuthMode('signup'));
      }
      if (els.toggleModeBtn) {
        els.toggleModeBtn.addEventListener('click', () => {
          setAuthMode(currentAuthMode === 'signin' ? 'signup' : 'signin');
        });
      }

      // Attach form submit listeners
      if (els.emailForm) {
        els.emailForm.addEventListener('submit', handleSendOtp);
      }
      if (els.togglePasswordBtn && els.passwordInput) {
        els.togglePasswordBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isPassword = els.passwordInput.type === 'password';
          els.passwordInput.type = isPassword ? 'text' : 'password';
          if (els.togglePasswordIcon) {
            els.togglePasswordIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
          }
        });
      }
      if (els.toggleConfirmPasswordBtn && els.confirmPasswordInput) {
        els.toggleConfirmPasswordBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isPassword = els.confirmPasswordInput.type === 'password';
          els.confirmPasswordInput.type = isPassword ? 'text' : 'password';
          if (els.toggleConfirmPasswordIcon) {
            els.toggleConfirmPasswordIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
          }
        });
      }
      if (els.otpForm) {
        els.otpForm.addEventListener('submit', handleVerifyOtp);
      }
      if (els.backToEmailBtn) {
        els.backToEmailBtn.addEventListener('click', () => switchAuthStep('email'));
      }
      if (els.resendOtpBtn) {
        els.resendOtpBtn.addEventListener('click', handleResendOtp);
      }
      if (els.signOutBtn) {
        els.signOutBtn.addEventListener('click', handleSignOut);
      }
      if (els.deleteAccountBtn) {
        els.deleteAccountBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openDeleteAccountConfirmModal();
        });
      }
      if (els.closeBtn) {
        els.closeBtn.addEventListener('click', closeLoginModal);
      }
      if (els.backdrop) {
        els.backdrop.addEventListener('click', (e) => {
          if (e.target === els.backdrop) closeLoginModal();
        });
      }
      if (els.continueBtn) {
        els.continueBtn.addEventListener('click', closeLoginModal);
      }

      // Auto-format OTP input (digits only, length 6)
      if (els.otpInput) {
        els.otpInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
          if (e.target.value.length === 6) {
            // Auto submit when 6 digits are entered
            handleVerifyOtp();
          }
        });
      }

      // Initialize the Profile Popover Window
      initProfilePopover();
    }

    // Connect Supabase Auth Listener
    connectSupabaseAuth();
  }

  // Expose API
  window.LaxmiAuth = {
    openModal: openLoginModal,
    closeModal: closeLoginModal,
    sendLink: (email, name) => {
      const els = getElements();
      if (els.emailInput) els.emailInput.value = email;
      if (els.nameInput && name) els.nameInput.value = name;
      return handleSendOtp();
    },
    sendOtp: (email, name) => {
      const els = getElements();
      if (els.emailInput) els.emailInput.value = email;
      if (els.nameInput && name) els.nameInput.value = name;
      return handleSendOtp();
    },
    verifyOtp: (token) => {
      const els = getElements();
      if (els.otpInput) els.otpInput.value = token;
      return handleVerifyOtp();
    },
    signOut: handleSignOut,
    executeSignOut: executeSignOut,
    openSignOutConfirm: openSignOutConfirmModal,
    closeSignOutConfirm: closeSignOutConfirmModal,
    deleteAccount: openDeleteAccountConfirmModal,
    executeDeleteAccount: executeDeleteAccount,
    openDeleteAccountConfirm: openDeleteAccountConfirmModal,
    closeDeleteAccountConfirm: closeDeleteAccountConfirmModal,
    switchStep: switchAuthStep,
    updateState: updateUserState
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthComponent);
  } else {
    initAuthComponent();
  }
})();
