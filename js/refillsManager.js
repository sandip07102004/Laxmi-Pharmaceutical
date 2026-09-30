/**
 * js/refillsManager.js - Individual User Refill & Dosage Adherence Manager
 * Powered by Supabase PostgreSQL with Row Level Security (RLS)
 * 
 * Features:
 * - Isolated per-user refill kits stored in Supabase (user_refill_items)
 * - Individual delivery preferences & schedule frequency (user_refill_preferences)
 * - Guest mode with seamless login prompt
 * - Dynamic adherence dosage tracker (Morning, Afternoon, Night)
 * - Add/Remove custom medicines or select from catalog
 * - Recommended starter pack generator for new patients
 * - 1-Click "Add Entire Kit to Cart" integration
 * - Instant real-time UI updates & sync across sessions
 */

(function () {
  'use strict';

  // Default starter pack for new patients
  const DEFAULT_STARTER_ITEMS = [
    {
      medicine_id: 'med-1',
      medicine_name: 'Metformin Hydrochloride ER 500mg',
      dosage_instructions: '1 Tablet',
      slot: 'night',
      pack_size: '60 Tablets · 30 Days',
      price: 68.50,
      is_taken_today: false
    },
    {
      medicine_id: 'med-2',
      medicine_name: 'Telmisartan Tablets IP 40mg',
      dosage_instructions: '1 Tablet',
      slot: 'morning',
      pack_size: '30 Tablets · 30 Days',
      price: 142.00,
      is_taken_today: true
    },
    {
      medicine_id: 'med-4',
      medicine_name: 'Neurobion Forte B-Complex',
      dosage_instructions: '1 Tablet',
      slot: 'noon',
      pack_size: '30 Tablets · 30 Days',
      price: 38.50,
      is_taken_today: false
    }
  ];

  // State
  const state = {
    user: null,
    isLoggedIn: false,
    preferences: null,
    items: [],
    loading: false
  };

  /**
   * Helper to retrieve active Supabase Client
   */
  function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.getSupabaseClient === 'function') {
      return window.getSupabaseClient();
    }
    return null;
  }

  /**
   * Toast notification helper
   */
  function notify(message, icon = 'check_circle') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, icon);
      return;
    }
    let toast = document.getElementById('refillCustomToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'refillCustomToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #005c55;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span><span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
    }, 3500);
  }

  /**
   * Fetch User Data from Supabase
   */
  async function fetchUserData(userId) {
    const client = getClient();
    if (!client || !userId) return;

    state.loading = true;
    renderLoadingState(true);

    try {
      // 1. Fetch user refill preferences
      const { data: prefData, error: prefError } = await client
        .from('user_refill_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefError) {
        console.error('[RefillsManager] Error fetching preferences:', prefError.message);
      }

      if (!prefData) {
        // Insert default initial preference record
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        const { data: newPref } = await client
          .from('user_refill_preferences')
          .insert({
            user_id: userId,
            cycle_frequency: 'Every 30 Days (Standard Monthly)',
            delivery_slot: 'Morning (7:00 AM – 10:00 AM)',
            delivery_address: '',
            adherence_streak: 0,
            next_refill_date: nextDate.toISOString().split('T')[0]
          })
          .select()
          .single();
        state.preferences = newPref;
      } else {
        state.preferences = prefData;
      }

      // Check if user had typed an address before logging in
      const addrInput = document.getElementById('refillDeliveryAddressInput');
      if (addrInput && addrInput.value && addrInput.value.trim() && !state.preferences.delivery_address) {
        state.preferences.delivery_address = addrInput.value.trim();
        await client
          .from('user_refill_preferences')
          .update({ delivery_address: addrInput.value.trim() })
          .eq('user_id', userId);
      }

      // 2. Fetch user refill items
      const { data: itemsData, error: itemsError } = await client
        .from('user_refill_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('[RefillsManager] Error fetching items:', itemsError.message);
      }

      // New users start with an empty refill kit
      state.items = itemsData || [];
    } catch (err) {
      console.error('[RefillsManager] Unexpected fetch error:', err);
    } finally {
      state.loading = false;
      renderLoadingState(false);
      renderAll();
    }
  }

  /**
   * Load Starter Kit for new patient
   */
  async function loadStarterKit() {
    const client = getClient();
    if (!client || !state.user) {
      notify('Please sign in to personalize your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    try {
      localStorage.removeItem('laxmi_refill_cleared_' + state.user.id);
      const itemsToInsert = DEFAULT_STARTER_ITEMS.map(item => ({
        ...item,
        user_id: state.user.id
      }));

      const { data, error } = await client
        .from('user_refill_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      state.items = [...state.items, ...(data || [])];
      renderAll();
      notify('Recommended Starter Kit loaded into your refill pack!', 'verified');
    } catch (err) {
      console.error('[RefillsManager] Error loading starter kit:', err);
      notify('Could not load starter kit: ' + err.message, 'error');
    }
  }

  /**
   * Add a Medicine to the user's refill kit
   */
  async function addMedicine(itemData) {
    const client = getClient();
    if (!client || !state.user) {
      notify('Please sign in to add medicines to your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    try {
      localStorage.removeItem('laxmi_refill_cleared_' + state.user.id);
      const payload = {
        user_id: state.user.id,
        medicine_id: itemData.medicine_id || null,
        medicine_name: itemData.medicine_name.trim(),
        dosage_instructions: itemData.dosage_instructions || '1 Tablet',
        slot: itemData.slot || 'morning',
        pack_size: itemData.pack_size || '30 Tablets · 30 Days',
        price: parseFloat(itemData.price) || 0.00,
        is_taken_today: false
      };

      const { data, error } = await client
        .from('user_refill_items')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      state.items.push(data);
      renderAll();
      closeAddModal();
      notify(`Added ${payload.medicine_name} to your refill kit!`, 'medication');
    } catch (err) {
      console.error('[RefillsManager] Error adding medicine:', err);
      notify('Failed to add medicine: ' + err.message, 'error');
    }
  }

  /**
   * Update an existing medicine in the user's refill kit
   */
  async function updateMedicine(itemId, updatedData) {
    const client = getClient();
    if (!client || !state.user) {
      notify('Please sign in to edit medicines.', 'lock');
      return;
    }

    try {
      const payload = {
        medicine_name: updatedData.medicine_name.trim(),
        dosage_instructions: updatedData.dosage_instructions || '1 Tablet',
        slot: updatedData.slot || 'morning',
        pack_size: updatedData.pack_size || '30 Tablets · 30 Days'
      };

      if (updatedData.medicine_id) payload.medicine_id = updatedData.medicine_id;
      if (typeof updatedData.price === 'number') payload.price = updatedData.price;

      const { data, error } = await client
        .from('user_refill_items')
        .update(payload)
        .eq('id', itemId)
        .eq('user_id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      const idx = state.items.findIndex(i => String(i.id) === String(itemId));
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...data };
      }

      renderAll();
      closeEditModal();
      notify(`Updated ${payload.medicine_name}!`, 'verified');
    } catch (err) {
      console.error('[RefillsManager] Error updating medicine:', err);
      notify('Failed to update medicine: ' + err.message, 'error');
    }
  }

  /**
   * Remove a Medicine from the user's refill kit
   */
  async function removeMedicine(itemId) {
    const client = getClient();
    if (!client || !state.user) return;

    // Find the medicine name for the confirmation message
    const medicine = state.items.find(item => item.id === itemId);
    const medicineName = medicine ? medicine.medicine_name : 'this medicine';

    const confirmed = await showConfirmPopup(
      'Remove Medicine',
      `Are you sure you want to remove <strong>${medicineName}</strong> from your chronic refill pack?`,
      'Remove',
      'Cancel'
    );
    if (!confirmed) return;

    try {
      const { error } = await client
        .from('user_refill_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', state.user.id);

      if (error) throw error;

      state.items = state.items.filter(item => item.id !== itemId);
      if (state.items.length === 0) {
        localStorage.setItem('laxmi_refill_cleared_' + state.user.id, 'true');
      }
      renderAll();
      notify('Medicine removed from your refill pack.', 'delete');
    } catch (err) {
      console.error('[RefillsManager] Error removing medicine:', err);
      notify('Could not remove medicine: ' + err.message, 'error');
    }
  }

  /**
   * Custom styled confirmation popup (replaces native confirm())
   */
  function showConfirmPopup(title, message, confirmText = 'Remove', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      // Remove any existing popup
      const existing = document.getElementById('refillConfirmPopup');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'refillConfirmPopup';
      backdrop.style.cssText = 'position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); animation: refillPopupFadeIn 0.2s ease;';

      backdrop.innerHTML = `
        <style>
          @keyframes refillPopupFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes refillPopupSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        </style>
        <div style="background: #ffffff; border-radius: 16px; width: 92%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: refillPopupSlideUp 0.25s ease; overflow: hidden;">
          <div style="padding: 24px 24px 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="width: 42px; height: 42px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="color: #dc2626; font-size: 22px;">delete_forever</span>
              </div>
              <div>
                <div style="font-weight: 700; font-size: 1.05rem; color: #1a202c;">${title}</div>
              </div>
            </div>
            <p style="font-size: 0.92rem; color: #4a5568; line-height: 1.55; margin: 0 0 20px;">${message}</p>
          </div>
          <div style="display: flex; gap: 10px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            <button id="refillConfirmCancel" type="button" style="flex: 1; padding: 10px 16px; border-radius: 10px; border: 1.5px solid #d1d5db; background: #ffffff; color: #374151; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.15s ease;">
              ${cancelText}
            </button>
            <button id="refillConfirmOk" type="button" style="flex: 1; padding: 10px 16px; border-radius: 10px; border: none; background: #dc2626; color: #ffffff; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const cleanup = (result) => {
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'opacity 0.15s ease';
        setTimeout(() => backdrop.remove(), 150);
        resolve(result);
      };

      document.getElementById('refillConfirmCancel').addEventListener('click', () => cleanup(false));
      document.getElementById('refillConfirmOk').addEventListener('click', () => cleanup(true));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanup(false);
      });
    });
  }

  /**
   * Toggle Medicine Taken / Pending status
   */
  async function toggleMedicineTaken(itemId) {
    const client = getClient();
    if (!client || !state.user) {
      notify('Please sign in to track your personal dosage adherence.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    const newStatus = !item.is_taken_today;
    const takenAt = newStatus ? new Date().toISOString() : null;

    // Optimistic UI update
    item.is_taken_today = newStatus;
    item.taken_at = takenAt;
    renderAdherenceGrid();

    try {
      const { error } = await client
        .from('user_refill_items')
        .update({ is_taken_today: newStatus, taken_at: takenAt })
        .eq('id', itemId)
        .eq('user_id', state.user.id);

      if (error) throw error;

      // Check if all taken today
      const allTaken = state.items.length > 0 && state.items.every(i => i.is_taken_today);
      if (allTaken && state.preferences && newStatus) {
        const newStreak = (state.preferences.adherence_streak || 0) + 1;
        state.preferences.adherence_streak = newStreak;
        await client
          .from('user_refill_preferences')
          .update({ adherence_streak: newStreak })
          .eq('user_id', state.user.id);
        renderStreakBadge();
        notify(`🎉 Fantastic! All doses complete today! Streak: ${newStreak} days!`, 'celebration');
      } else {
        notify(`${item.medicine_name} marked as ${newStatus ? 'Taken ✓' : 'Pending'}.`, newStatus ? 'check_circle' : 'schedule');
      }
    } catch (err) {
      console.error('[RefillsManager] Error toggling dose status:', err);
      // Revert optimistic update
      item.is_taken_today = !newStatus;
      renderAdherenceGrid();
      notify('Could not sync status: ' + err.message, 'error');
    }
  }

  /**
   * Save User Refill Preferences (Address, Frequency, Delivery Slot)
   */
  async function savePreferences(formData) {
    const client = getClient();
    if (!client || !state.user) {
      notify('Please sign in to save your refill schedule.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    try {
      const payload = {
        cycle_frequency: formData.cycle_frequency,
        delivery_slot: formData.delivery_slot,
        delivery_address: formData.delivery_address,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('user_refill_preferences')
        .upsert({
          user_id: state.user.id,
          ...payload
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      state.preferences = data;
      notify('Refill schedule & delivery address saved to your profile!', 'verified');
    } catch (err) {
      console.error('[RefillsManager] Error saving preferences:', err);
      notify('Could not save preferences: ' + err.message, 'error');
    }
  }

  /**
   * Add all items in current kit to Cart
   */
  function addKitToCart() {
    if (!state.isLoggedIn) {
      notify('Please sign in to personalize and order your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    if (!state.items || state.items.length === 0) {
      notify('Your refill kit has no medicines. Add medicines first.', 'info');
      return;
    }

    let addedCount = 0;
    state.items.forEach(item => {
      if (typeof window.addToCart === 'function') {
        window.addToCart({
          id: item.medicine_id || ('kit_' + item.id),
          name: item.medicine_name,
          price: item.price || 95.0,
          dosage: item.dosage_instructions,
          pack: item.pack_size || '30 Tablets · 30 Days',
          slot: item.slot || 'morning',
          isRefill: true,
          categoryLabel: 'Refill Kit'
        }, false);
        addedCount++;
      }
    });

    notify(`Added ${addedCount} refill medicine${addedCount !== 1 ? 's' : ''} to your cart!`, 'shopping_bag');
    
    // Open cart drawer if available
    const cartTrigger = document.getElementById('cartTrigger');
    if (cartTrigger) {
      setTimeout(() => cartTrigger.click(), 400);
    }
  }

  /**
   * Renew Kit (1-Click button)
   */
  async function handle1ClickRenew() {
    if (!state.isLoggedIn) {
      notify('Please sign in to manage your refill schedule.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    if (state.items.length === 0) {
      notify('Please add medicines to your kit before renewing.', 'info');
      return;
    }

    const btn = document.getElementById('renewRefillBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">autorenew</span> Scheduling Renewal...';
    }

    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const formattedDate = nextDate.toISOString().split('T')[0];

      const client = getClient();
      if (client) {
        await client
          .from('user_refill_preferences')
          .update({ next_refill_date: formattedDate })
          .eq('user_id', state.user.id);
      }

      if (state.preferences) {
        state.preferences.next_refill_date = formattedDate;
      }

      addKitToCart();

      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">verified</span> Renewal Scheduled';
        }
        renderAlertBanner();
        notify(`Chronic Kit Renewal Confirmed! Next cycle on ${formattedDate}.`, 'local_shipping');
      }, 700);
    } catch (err) {
      console.error(err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">autorenew</span> 1-Click Renew Kit';
      }
    }
  }

  // ==========================================
  // UI Rendering Functions
  // ==========================================

  function renderLoadingState(isLoading) {
    const overlay = document.getElementById('refillLoadingOverlay');
    if (overlay) {
      overlay.style.display = isLoading ? 'flex' : 'none';
    }
  }

  function renderAuthBanner() {
    const bannerContainer = document.getElementById('refillAuthBanner');
    if (!bannerContainer) return;

    if (!state.isLoggedIn) {
      bannerContainer.innerHTML = `
        <div class="refill-guest-card" style="background: linear-gradient(135deg, rgba(0, 92, 85, 0.08) 0%, rgba(108, 248, 187, 0.15) 100%); border: 1.5px solid rgba(0, 92, 85, 0.2); border-radius: var(--radius-xl); padding: 22px 26px; margin-bottom: var(--space-xl); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px; max-width: 680px;">
            <div style="width: 50px; height: 50px; border-radius: 14px; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,92,85,0.25);">
              <span class="material-symbols-outlined text-[28px]">lock_person</span>
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-on-surface); margin-bottom: 4px;">
                Sign In to Save & Access Your Personal Refill Kit
              </div>
              <p style="font-size: 0.9rem; color: var(--color-on-surface-variant); margin: 0; line-height: 1.5;">
                Your medication schedule, daily adherence streak, and monthly refill pouches are saved separately for your account. Log in or create an account to personalize your kit.
              </p>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-primary" onclick="window.LaxmiAuth && window.LaxmiAuth.openModal('signin')">
              <span class="material-symbols-outlined text-[18px]">login</span>
              Sign In to My Kit
            </button>
          </div>
        </div>
      `;
    } else {
      const email = state.user.email || 'patient';
      const name = state.user.user_metadata?.full_name || state.user.user_metadata?.name || email.split('@')[0];
      const streak = state.preferences?.adherence_streak || 0;

      bannerContainer.innerHTML = `
        <div class="refill-user-card" style="background: #ffffff; border: 1.5px solid var(--color-surface-container); border-radius: var(--radius-xl); padding: 18px 24px; margin-bottom: var(--space-xl); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--color-primary-container); color: var(--color-on-primary-container); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem;">
              ${name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 1.05rem; color: var(--color-on-surface);">
                ${name}'s Refill Care Dashboard
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  function renderAlertBanner() {
    const alertBox = document.getElementById('chronicHeaderAlert');
    if (!alertBox) return;

    if (!state.isLoggedIn) {
      alertBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 92, 85, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span class="material-symbols-outlined text-[28px]" style="color: var(--color-primary);">notifications_none</span>
          </div>
          <div>
            <div style="font-weight: 700; color: var(--color-on-surface); font-size: 1.05rem;" id="refillAlertTitle">Refill Schedule: No Active Regimen</div>
            <div style="font-size: 0.88rem; color: var(--color-on-surface-variant);" id="refillAlertSubtitle">Sign in to activate your automated monthly refills and track daily dosage adherence.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="renewRefillBtn" onclick="window.LaxmiAuth && window.LaxmiAuth.openModal('signin')">
          <span class="material-symbols-outlined text-[16px]">login</span>
          Sign In
        </button>
      `;
      return;
    }

    const itemCount = state.items.length;
    let nextDateText = 'Due in 30 Days';

    if (state.preferences?.next_refill_date) {
      const parts = state.preferences.next_refill_date.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          nextDateText = `Due in ${diff} Day${diff !== 1 ? 's' : ''} (${state.preferences.next_refill_date})`;
        } else if (diff === 0) {
          nextDateText = 'Due Today!';
        } else {
          nextDateText = `Overdue by ${Math.abs(diff)} Day${Math.abs(diff) !== 1 ? 's' : ''}`;
        }
      }
    }

    if (itemCount === 0) {
      alertBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 92, 85, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span class="material-symbols-outlined text-[28px]" style="color: var(--color-primary);">medication</span>
          </div>
          <div>
            <div style="font-weight: 700; color: var(--color-on-surface); font-size: 1.05rem;" id="refillAlertTitle">Refill Schedule: Kit is Empty</div>
            <div style="font-size: 0.88rem; color: var(--color-on-surface-variant);" id="refillAlertSubtitle">Add your daily chronic medicines below to establish your automated refill cycle.</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.RefillsManager.openAddModal()">
          <span class="material-symbols-outlined text-[16px]">add</span>
          Add Medicine
        </button>
      `;
      return;
    }

    const medSummary = state.items.map(i => i.medicine_name.split(' ')[0]).slice(0, 3).join(', ') + ` (${itemCount} Medicine${itemCount !== 1 ? 's' : ''} · Monthly Kit)`;

    alertBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(125, 66, 0, 0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span class="material-symbols-outlined text-tertiary text-[28px]">notification_important</span>
        </div>
        <div>
          <div style="font-weight: 700; color: var(--color-tertiary); font-size: 1.05rem;" id="refillAlertTitle">Refill Alert</div>
          <div style="font-size: 0.88rem; color: var(--color-on-surface);" id="refillAlertSubtitle">${medSummary}</div>
        </div>
      </div>
      <button class="btn btn-amber btn-sm" id="renewRefillBtn" onclick="window.RefillsManager.handle1ClickRenew()">
        <span class="material-symbols-outlined text-[16px]">autorenew</span>
        1-Click Renew Kit
      </button>
    `;
  }

  function renderStreakBadge() {
    const streak = state.isLoggedIn && state.preferences?.adherence_streak ? state.preferences.adherence_streak : 0;
    const badgeTop = document.getElementById('refillStreakBadgeTop');
    if (badgeTop) badgeTop.textContent = `${streak}-Day Streak 🔥`;
  }

  function renderAdherenceGrid() {
    const grid = document.getElementById('pillScheduleGrid');
    if (!grid) return;

    const slots = [
      { key: 'morning', name: 'Morning', time: '8:00 AM', label: 'Morning (8:00 AM)', desc: 'With / after breakfast', icon: 'wb_twilight', iconColor: '#d97706' },
      { key: 'noon', name: 'Afternoon', time: '1:30 PM', label: 'Afternoon (1:30 PM)', desc: 'With / after lunch', icon: 'sunny', iconColor: '#ea580c' },
      { key: 'night', name: 'Night', time: '8:30 PM', label: 'Night (8:30 PM)', desc: 'With / after dinner', icon: 'bedtime', iconColor: '#6366f1' }
    ];

    if (!state.isLoggedIn) {
      // Empty adherence grid for guest / logged-out user
      let html = '';
      slots.forEach(slot => {
        html += `
          <div class="pill-time-slot" data-slot="${slot.key}" style="position: relative;">
            <div class="time-slot-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                  <span class="material-symbols-outlined text-[18px]" style="color: ${slot.iconColor};">${slot.icon}</span>
                </div>
                <div>
                  <div class="time-slot-name" style="font-weight: 700; font-size: 0.92rem; line-height: 1.2; color: var(--color-on-surface);">${slot.name}</div>
                  <div style="font-size: 0.76rem; color: var(--color-on-surface-variant); font-weight: 600; line-height: 1.2; margin-top: 2px;">${slot.time}</div>
                </div>
              </div>
              <span class="time-slot-badge" style="color: var(--color-outline); background: #ffffff;">
                Empty
              </span>
            </div>
            <div style="padding: 14px 0 10px; color: var(--color-on-surface-variant); font-size: 0.85rem; font-style: italic;">
              No medicines scheduled.
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.LaxmiAuth && window.LaxmiAuth.openModal('signin')" style="margin-top: 8px; font-size: 11px; padding: 4px 10px;">
              + Add to ${slot.name}
            </button>
          </div>
        `;
      });
      grid.innerHTML = html;
      return;
    }

    // Group user's items by slot
    let html = '';
    slots.forEach(slot => {
      const slotItems = state.items.filter(item => item.slot === slot.key);
      const isTaken = slotItems.length > 0 && slotItems.every(i => i.is_taken_today);
      const singleItemId = slotItems.length === 1 ? slotItems[0].id : null;

      html += `
        <div class="pill-time-slot ${isTaken ? 'taken' : ''}" data-slot="${slot.key}" style="position: relative;" ${singleItemId ? `onclick="if(!event.target.closest('button')) window.RefillsManager.toggleMedicineTaken('${singleItemId}')"` : ''}>
          <div class="time-slot-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                <span class="material-symbols-outlined text-[18px]" style="color: ${slot.iconColor};">${slot.icon}</span>
              </div>
              <div>
                <div class="time-slot-name" style="font-weight: 700; font-size: 0.92rem; line-height: 1.2; color: var(--color-on-surface);">${slot.name}</div>
                <div style="font-size: 0.76rem; color: var(--color-on-surface-variant); font-weight: 600; line-height: 1.2; margin-top: 2px;">${slot.time}</div>
              </div>
            </div>
            <span class="time-slot-badge" style="${isTaken ? 'color: #15803d; background: #dcfce7;' : (slotItems.length === 0 ? 'color: var(--color-outline); background: #ffffff;' : 'color: var(--color-outline); background: #ffffff;')}">
              ${isTaken ? 'Taken ✓' : (slotItems.length === 0 ? 'Empty' : 'Pending')}
            </span>
          </div>
      `;

      if (slotItems.length === 0) {
        html += `
          <div style="padding: 10px 0; color: var(--color-on-surface-variant); font-size: 0.85rem; font-style: italic;">
            No medicines scheduled.
          </div>
        `;
      } else {
        slotItems.forEach(item => {
          html += `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.06); cursor: pointer;" ${slotItems.length > 1 ? `onclick="if(!event.target.closest('button')) window.RefillsManager.toggleMedicineTaken('${item.id}')"` : ''} title="Click to toggle taken status">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="font-weight: 700; font-size: 0.95rem; color: ${item.is_taken_today ? '#15803d' : 'var(--color-on-surface)'}; text-decoration: ${item.is_taken_today ? 'line-through' : 'none'}; flex: 1;">
                  ${item.medicine_name}
                </div>
                <div style="display: flex; align-items: center;">
                  <span class="material-symbols-outlined text-[20px]" style="color: ${item.is_taken_today ? '#15803d' : 'var(--color-outline)'};">
                    ${item.is_taken_today ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
              </div>
              <p style="font-size: 0.8rem; color: var(--color-on-surface-variant); margin-top: 2px;">${formatDosage(item.dosage_instructions)}</p>
            </div>
          `;
        });
      }

      // Always keep '+ Add to slot' button visible
      const slotNameDisplay = slot.key === 'noon' ? 'afternoon' : slot.key;
      html += `
        <button type="button" class="btn btn-outline btn-sm" onclick="window.RefillsManager.openAddModal('${slot.key}')" style="margin-top: 8px; font-size: 11px; padding: 4px 10px;">
          + Add to ${slotNameDisplay}
        </button>
      `;

      html += `</div>`;
    });

    grid.innerHTML = html;
  }

  function renderRefillPack() {
    const packContainer = document.getElementById('refillPackItemsList');
    const totalEl = document.getElementById('refillKitTotal');
    if (!packContainer || !totalEl) return;

    if (!state.isLoggedIn) {
      // Empty refill pack when no user is logged in
      packContainer.innerHTML = `
        <div style="text-align: center; padding: 28px 14px; background: var(--color-surface-container-low); border-radius: 12px; border: 1.5px dashed var(--color-outline-variant);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline); margin-bottom: 8px;">medication</span>
          <div style="font-weight: 700; font-size: 1rem; color: var(--color-on-surface);">Your Refill Kit is Empty</div>
          <p style="font-size: 0.85rem; color: var(--color-on-surface-variant); margin: 6px auto 16px; max-width: 440px; line-height: 1.5;">
            Sign in to your patient account to build your chronic prescription kit and automate monthly deliveries.
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.LaxmiAuth && window.LaxmiAuth.openModal('signin')">
            <span class="material-symbols-outlined text-[16px]">login</span>
            Sign In to Add Medicines
          </button>
        </div>
      `;
      totalEl.textContent = '₹0.00';
      return;
    }

    if (state.items.length === 0) {
      packContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; background: var(--color-surface-container-low); border-radius: 12px; border: 1px dashed var(--color-outline-variant);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline); margin-bottom: 8px;">medication</span>
          <div style="font-weight: 700; font-size: 1rem; color: var(--color-on-surface);">Your Refill Kit is Empty</div>
          <p style="font-size: 0.85rem; color: var(--color-on-surface-variant); margin: 6px 0 16px;">
            Add your daily chronic medicines to automate your monthly refills and monitor daily dosage adherence.
          </p>
          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">

            <button type="button" class="btn btn-outline btn-sm" onclick="window.RefillsManager.openAddModal()">
              <span class="material-symbols-outlined text-[16px]">add</span>
              Add Custom Medicine
            </button>
          </div>
        </div>
      `;
      totalEl.textContent = '₹0.00';
      return;
    }

    let subtotal = 0;
    let html = '';

    state.items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      subtotal += price;
      const slotBadgeColor = item.slot === 'morning' ? '#e0f2fe; color: #0369a1;' : item.slot === 'noon' ? '#fef3c7; color: #b45309;' : '#f3e8ff; color: #7e22ce;';

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--color-surface-container-low); border-radius: 8px; border: 1px solid var(--color-surface-container);">
          <div style="flex: 1; padding-right: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 0.95rem;">${item.medicine_name}</span>
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; background: ${slotBadgeColor}">
                ${item.slot ? item.slot.toUpperCase() : 'DAILY'}
              </span>
            </div>
            <div style="font-size: 12px; color: var(--color-on-surface-variant); margin-top: 2px;">
              ${item.pack_size} · ${formatDosage(item.dosage_instructions)}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-weight: 700; color: var(--color-primary); font-size: 1rem;">
              ₹${price.toFixed(2)}
            </div>
            <button type="button" class="btn btn-icon" onclick="window.RefillsManager.openEditModal('${item.id}')" style="background: none; border: none; color: var(--color-outline); cursor: pointer; padding: 4px; display: flex; align-items: center;" title="Edit medicine">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button type="button" class="btn btn-icon" onclick="window.RefillsManager.removeMedicine('${item.id}')" style="background: none; border: none; color: #b91c1c; cursor: pointer; padding: 4px; display: flex; align-items: center;" title="Remove from refill pack">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      `;
    });

    packContainer.innerHTML = html;
    totalEl.textContent = `₹${subtotal.toFixed(2)}`;
  }

  function renderPreferencesForm() {
    const freqSelect = document.getElementById('refillFrequencySelect');
    const slotSelect = document.getElementById('refillDeliverySlotSelect');
    const addrInput = document.getElementById('refillDeliveryAddressInput');

    if (!freqSelect && !slotSelect && !addrInput) return;

    if (!state.isLoggedIn || !state.preferences) {
      if (addrInput && !state.isLoggedIn) {
        addrInput.placeholder = 'Please sign in to set your permanent refill delivery address';
      }
      return;
    }

    if (freqSelect && state.preferences.cycle_frequency) {
      freqSelect.value = state.preferences.cycle_frequency;
    }
    if (slotSelect && state.preferences.delivery_slot) {
      slotSelect.value = state.preferences.delivery_slot;
    }
    if (addrInput) {
      addrInput.value = state.preferences.delivery_address || '';
    }
  }

  function renderAll() {
    renderAuthBanner();
    renderAlertBanner();
    renderStreakBadge();
    renderAdherenceGrid();
    renderRefillPack();
    renderPreferencesForm();
  }

  // ==========================================
  // Add Medicine Modal Logic
  // ==========================================
  function selectModalSlot(slot) {
    const slotInput = document.getElementById('modalMedSlot');
    if (slotInput) slotInput.value = slot;

    const chips = document.querySelectorAll('.refill-slot-chip');
    chips.forEach(chip => {
      const isSelected = chip.getAttribute('data-slot') === slot;
      if (isSelected) {
        chip.style.background = 'var(--color-primary)';
        chip.style.color = '#ffffff';
        chip.style.borderColor = 'var(--color-primary)';
        chip.style.boxShadow = '0 3px 10px rgba(0, 92, 85, 0.25)';
      } else {
        chip.style.background = '#ffffff';
        chip.style.color = 'var(--color-on-surface)';
        chip.style.borderColor = 'var(--color-outline-variant)';
        chip.style.boxShadow = 'none';
      }
    });
  }

  function setModalMedicineName(name) {
    const nameInput = document.getElementById('modalMedName');
    if (nameInput) {
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('change'));
    }
  }

  function extractTabletNumber(dosage) {
    if (!dosage) return '1';
    const match = String(dosage).match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= 1 && num <= 10) return String(num);
      if (num > 10) return '10';
    }
    return '1';
  }

  function formatDosage(dosage) {
    if (!dosage) return '1 Tablet';
    const num = extractTabletNumber(dosage);
    return `${num} Tablet${Number(num) > 1 ? 's' : ''}`;
  }

  function setModalDosage(dosage) {
    const dosageInput = document.getElementById('modalMedDosage');
    if (dosageInput && dosage) {
      dosageInput.value = extractTabletNumber(dosage);
    }
  }

  function openAddModal(preselectedSlot = 'morning') {
    if (!state.isLoggedIn) {
      notify('Please sign in to add medicines to your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    let modal = document.getElementById('addRefillMedicineModal');
    if (!modal) {
      createAddModal();
      modal = document.getElementById('addRefillMedicineModal');
    }

    selectModalSlot(preselectedSlot);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Auto-focus input
    setTimeout(() => {
      const nameInput = document.getElementById('modalMedName');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function closeAddModal() {
    const modal = document.getElementById('addRefillMedicineModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      const form = document.getElementById('addRefillMedicineForm');
      if (form) form.reset();
      selectModalSlot('morning');
    }
  }

  function createAddModal() {
    const modalHtml = `
      <div id="addRefillMedicineModal" class="login-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div class="login-modal" style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: popIn 0.25s ease;">
          <div style="padding: 18px 24px; border-bottom: 1px solid var(--color-surface-container); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-outlined text-[24px]" style="color: var(--color-primary);">medication</span>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Add Medicine to Refill Pack</h3>
            </div>
            <button type="button" onclick="window.RefillsManager.closeAddModal()" style="background: none; border: none; cursor: pointer; color: var(--color-outline); padding: 4px;">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="addRefillMedicineForm" onsubmit="window.RefillsManager.handleAddFormSubmit(event)" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;">
            <!-- Medicine Name -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">Medicine Name *</label>
              <input type="text" id="modalMedName" list="catalogMedicinesList" placeholder="Search medicine or type name..." required style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; font-size: 14px;">
              <datalist id="catalogMedicinesList"></datalist>
            </div>

            <!-- When to Take (Slot) -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">When to Take *</label>
              <input type="hidden" id="modalMedSlot" value="morning">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <button type="button" class="refill-slot-chip" data-slot="morning" onclick="window.RefillsManager.selectModalSlot('morning')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-primary); background: var(--color-primary); color: #fff; cursor: pointer; text-align: center; transition: all 0.15s ease; box-shadow: 0 3px 10px rgba(0, 92, 85, 0.25);">
                  <div style="font-size: 16px; margin-bottom: 2px;">🌅</div>
                  <div style="font-weight: 700; font-size: 12px;">Morning</div>
                  <div style="font-size: 10px; opacity: 0.85;">8:00 AM</div>
                </button>
                <button type="button" class="refill-slot-chip" data-slot="noon" onclick="window.RefillsManager.selectModalSlot('noon')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: #fff; color: var(--color-on-surface); cursor: pointer; text-align: center; transition: all 0.15s ease;">
                  <div style="font-size: 16px; margin-bottom: 2px;">☀️</div>
                  <div style="font-weight: 700; font-size: 12px;">Afternoon</div>
                  <div style="font-size: 10px; opacity: 0.7;">1:30 PM</div>
                </button>
                <button type="button" class="refill-slot-chip" data-slot="night" onclick="window.RefillsManager.selectModalSlot('night')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: #fff; color: var(--color-on-surface); cursor: pointer; text-align: center; transition: all 0.15s ease;">
                  <div style="font-size: 16px; margin-bottom: 2px;">🌙</div>
                  <div style="font-weight: 700; font-size: 12px;">Night</div>
                  <div style="font-size: 10px; opacity: 0.7;">8:30 PM</div>
                </button>
              </div>
            </div>

            <!-- No. of Tablets -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">No. of Tablets</label>
              <select id="modalMedDosage" style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; background: #fff; font-size: 14px; cursor: pointer;">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </div>

            <!-- Supply Duration -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">Supply Duration</label>
              <select id="modalMedPackSize" style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; background: #fff; font-size: 14px; cursor: pointer;">
                <option value="30 Tablets · 30 Days" selected>30 Days Supply (1 Month · Standard)</option>
                <option value="60 Tablets · 60 Days">60 Days Supply (2 Months)</option>
                <option value="90 Tablets · 90 Days">90 Days Supply (3 Months)</option>
                <option value="15 Tablets · 15 Days">15 Days Supply (Half Month)</option>
              </select>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-outline" onclick="window.RefillsManager.closeAddModal()" style="flex: 1; justify-content: center;">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">
                <span class="material-symbols-outlined text-[18px]">add_circle</span>
                Add to Refill Kit
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('addRefillMedicineModal');

    // Close on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAddModal();
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('addRefillMedicineModal');
        if (m && m.style.display === 'flex') closeAddModal();
      }
    });

    // Populate datalist from catalog if available
    const datalist = document.getElementById('catalogMedicinesList');
    if (datalist && typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
      datalist.innerHTML = LAXMI_DATA.medicines.map(m => `<option value="${m.name}">${m.dosage ? '· ' + m.dosage : ''}</option>`).join('');
    }

    // Auto-update dosage when selecting a known catalog medicine
    const nameInput = document.getElementById('modalMedName');
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        if (typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
          const matched = LAXMI_DATA.medicines.find(m => m.name.toLowerCase() === nameInput.value.toLowerCase().trim());
          if (matched) {
            const dosageInput = document.getElementById('modalMedDosage');
            if (dosageInput && matched.dosage) {
              setModalDosage(matched.dosage);
            }
          }
        }
      });
    }
  }

  function handleAddFormSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('modalMedName');
    const slotSelect = document.getElementById('modalMedSlot');
    const dosageInput = document.getElementById('modalMedDosage');
    const packSizeInput = document.getElementById('modalMedPackSize');

    if (!nameInput || !nameInput.value.trim()) return;

    let medId = null;
    let catalogPrice = 0;
    if (typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
      const match = LAXMI_DATA.medicines.find(m => m.name.toLowerCase() === nameInput.value.toLowerCase().trim());
      if (match) {
        medId = match.id;
        catalogPrice = match.price || 0;
      }
    }

    addMedicine({
      medicine_id: medId,
      medicine_name: nameInput.value.trim(),
      slot: slotSelect ? slotSelect.value : 'morning',
      price: catalogPrice,
      dosage_instructions: dosageInput && dosageInput.value.trim() ? formatDosage(dosageInput.value.trim()) : '1 Tablet',
      pack_size: packSizeInput ? packSizeInput.value.trim() : '30 Tablets · 30 Days'
    });
  }

  // ==========================================
  // Edit Medicine Modal Logic
  // ==========================================
  function selectEditModalSlot(slot) {
    const slotInput = document.getElementById('editModalMedSlot');
    if (slotInput) slotInput.value = slot;

    const chips = document.querySelectorAll('.refill-edit-slot-chip');
    chips.forEach(chip => {
      const isSelected = chip.getAttribute('data-slot') === slot;
      if (isSelected) {
        chip.style.background = 'var(--color-primary)';
        chip.style.color = '#ffffff';
        chip.style.borderColor = 'var(--color-primary)';
        chip.style.boxShadow = '0 3px 10px rgba(0, 92, 85, 0.25)';
      } else {
        chip.style.background = '#ffffff';
        chip.style.color = 'var(--color-on-surface)';
        chip.style.borderColor = 'var(--color-outline-variant)';
        chip.style.boxShadow = 'none';
      }
    });
  }

  function setEditModalDosage(dosage) {
    const dosageInput = document.getElementById('editModalMedDosage');
    if (dosageInput && dosage) {
      dosageInput.value = extractTabletNumber(dosage);
    }
  }

  function openEditModal(itemId) {
    if (!state.isLoggedIn) {
      notify('Please sign in to edit your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }

    const item = state.items.find(i => String(i.id) === String(itemId));
    if (!item) {
      notify('Medicine not found in kit.', 'error');
      return;
    }

    let modal = document.getElementById('editRefillMedicineModal');
    if (!modal) {
      createEditModal();
      modal = document.getElementById('editRefillMedicineModal');
    }

    const idInput = document.getElementById('editModalMedId');
    const nameInput = document.getElementById('editModalMedName');
    const dosageInput = document.getElementById('editModalMedDosage');
    const packSizeSelect = document.getElementById('editModalMedPackSize');

    if (idInput) idInput.value = item.id;
    if (nameInput) nameInput.value = item.medicine_name || '';
    if (dosageInput) setEditModalDosage(item.dosage_instructions || '1 Tablet');
    if (packSizeSelect) {
      packSizeSelect.value = item.pack_size || '30 Tablets · 30 Days';
      if (!packSizeSelect.value) {
        packSizeSelect.innerHTML += `<option value="${item.pack_size}" selected>${item.pack_size}</option>`;
      }
    }

    selectEditModalSlot(item.slot || 'morning');

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function closeEditModal() {
    const modal = document.getElementById('editRefillMedicineModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      const form = document.getElementById('editRefillMedicineForm');
      if (form) form.reset();
    }
  }

  function createEditModal() {
    const modalHtml = `
      <div id="editRefillMedicineModal" class="login-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div class="login-modal" style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: popIn 0.25s ease;">
          <div style="padding: 18px 24px; border-bottom: 1px solid var(--color-surface-container); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-outlined text-[24px]" style="color: var(--color-primary);">edit_note</span>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Edit Medicine</h3>
            </div>
            <button type="button" onclick="window.RefillsManager.closeEditModal()" style="background: none; border: none; cursor: pointer; color: var(--color-outline); padding: 4px;">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="editRefillMedicineForm" onsubmit="window.RefillsManager.handleEditFormSubmit(event)" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;">
            <input type="hidden" id="editModalMedId" value="">

            <!-- Medicine Name -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">Medicine Name *</label>
              <input type="text" id="editModalMedName" list="editCatalogMedicinesList" placeholder="Search medicine or type name..." required style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; font-size: 14px;">
              <datalist id="editCatalogMedicinesList"></datalist>
            </div>

            <!-- When to Take (Slot) -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">When to Take *</label>
              <input type="hidden" id="editModalMedSlot" value="morning">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <button type="button" class="refill-edit-slot-chip" data-slot="morning" onclick="window.RefillsManager.selectEditModalSlot('morning')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-primary); background: var(--color-primary); color: #fff; cursor: pointer; text-align: center; transition: all 0.15s ease; box-shadow: 0 3px 10px rgba(0, 92, 85, 0.25);">
                  <div style="font-size: 16px; margin-bottom: 2px;">🌅</div>
                  <div style="font-weight: 700; font-size: 12px;">Morning</div>
                  <div style="font-size: 10px; opacity: 0.85;">8:00 AM</div>
                </button>
                <button type="button" class="refill-edit-slot-chip" data-slot="noon" onclick="window.RefillsManager.selectEditModalSlot('noon')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: #fff; color: var(--color-on-surface); cursor: pointer; text-align: center; transition: all 0.15s ease;">
                  <div style="font-size: 16px; margin-bottom: 2px;">☀️</div>
                  <div style="font-weight: 700; font-size: 12px;">Afternoon</div>
                  <div style="font-size: 10px; opacity: 0.7;">1:30 PM</div>
                </button>
                <button type="button" class="refill-edit-slot-chip" data-slot="night" onclick="window.RefillsManager.selectEditModalSlot('night')" style="padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: #fff; color: var(--color-on-surface); cursor: pointer; text-align: center; transition: all 0.15s ease;">
                  <div style="font-size: 16px; margin-bottom: 2px;">🌙</div>
                  <div style="font-weight: 700; font-size: 12px;">Night</div>
                  <div style="font-size: 10px; opacity: 0.7;">8:30 PM</div>
                </button>
              </div>
            </div>

            <!-- No. of Tablets -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">No. of Tablets</label>
              <select id="editModalMedDosage" style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; background: #fff; font-size: 14px; cursor: pointer;">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </div>

            <!-- Supply Duration -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--color-on-surface);">Supply Duration</label>
              <select id="editModalMedPackSize" style="width: 100%; height: 42px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); padding: 0 12px; background: #fff; font-size: 14px; cursor: pointer;">
                <option value="30 Tablets · 30 Days">30 Days Supply (1 Month · Standard)</option>
                <option value="60 Tablets · 60 Days">60 Days Supply (2 Months)</option>
                <option value="90 Tablets · 90 Days">90 Days Supply (3 Months)</option>
                <option value="15 Tablets · 15 Days">15 Days Supply (Half Month)</option>
              </select>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-outline" onclick="window.RefillsManager.closeEditModal()" style="flex: 1; justify-content: center;">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">
                <span class="material-symbols-outlined text-[18px]">save</span>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('editRefillMedicineModal');

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('editRefillMedicineModal');
        if (m && m.style.display === 'flex') closeEditModal();
      }
    });

    const datalist = document.getElementById('editCatalogMedicinesList');
    if (datalist && typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
      datalist.innerHTML = LAXMI_DATA.medicines.map(m => `<option value="${m.name}">${m.dosage ? '· ' + m.dosage : ''}</option>`).join('');
    }

    const nameInput = document.getElementById('editModalMedName');
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        if (typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
          const matched = LAXMI_DATA.medicines.find(m => m.name.toLowerCase() === nameInput.value.toLowerCase().trim());
          if (matched && matched.dosage) {
            const dosageInput = document.getElementById('editModalMedDosage');
            if (dosageInput) {
              setEditModalDosage(matched.dosage);
            }
          }
        }
      });
    }
  }

  async function handleEditFormSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('editModalMedId');
    const nameInput = document.getElementById('editModalMedName');
    const slotInput = document.getElementById('editModalMedSlot');
    const dosageInput = document.getElementById('editModalMedDosage');
    const packSizeSelect = document.getElementById('editModalMedPackSize');

    if (!idInput || !idInput.value || !nameInput || !nameInput.value.trim()) return;

    const itemId = idInput.value;
    let medId = null;
    let catalogPrice = null;

    if (typeof LAXMI_DATA !== 'undefined' && Array.isArray(LAXMI_DATA.medicines)) {
      const match = LAXMI_DATA.medicines.find(m => m.name.toLowerCase() === nameInput.value.toLowerCase().trim());
      if (match) {
        medId = match.id;
        catalogPrice = match.price || 0;
      }
    }

    const updatedData = {
      medicine_name: nameInput.value.trim(),
      slot: slotInput ? slotInput.value : 'morning',
      dosage_instructions: dosageInput && dosageInput.value.trim() ? formatDosage(dosageInput.value.trim()) : '1 Tablet',
      pack_size: packSizeSelect ? packSizeSelect.value : '30 Tablets · 30 Days'
    };
    if (medId) updatedData.medicine_id = medId;
    if (catalogPrice !== null) updatedData.price = catalogPrice;

    await updateMedicine(itemId, updatedData);
  }

  // ==========================================
  // Initialization & Event Listeners
  // ==========================================
  async function checkAuthAndInit() {
    const client = getClient();
    if (!client) {
      setTimeout(checkAuthAndInit, 300);
      return;
    }

    try {
      const { data: { user } } = await client.auth.getUser();
      state.user = user;
      state.isLoggedIn = !!user;

      if (state.isLoggedIn) {
        await fetchUserData(user.id);
      } else {
        renderAll();
      }

      // Listen for Supabase Auth state changes
      client.auth.onAuthStateChange(async (event, session) => {
        const newUser = session?.user || null;
        if (newUser?.id !== state.user?.id) {
          state.user = newUser;
          state.isLoggedIn = !!newUser;
          if (state.isLoggedIn) {
            await fetchUserData(newUser.id);
          } else {
            state.items = [];
            state.preferences = null;
            renderAll();
          }
        }
      });
    } catch (err) {
      console.warn('[RefillsManager] Auth check warning:', err);
      renderAll();
    }
  }

  // Listen to Laxmi Pharma global auth event
  window.addEventListener('laxmi:auth:state', async (e) => {
    const { user, isLoggedIn } = e.detail || {};
    if (isLoggedIn && user && user.id !== state.user?.id) {
      state.user = user;
      state.isLoggedIn = true;
      await fetchUserData(user.id);
    } else if (!isLoggedIn && state.isLoggedIn) {
      state.user = null;
      state.isLoggedIn = false;
      state.items = [];
      state.preferences = null;
      renderAll();
    }
  });

  // Setup Refills Form Listener
  function setupFormListeners() {
    const prefsForm = document.getElementById('refillPreferencesForm');
    if (prefsForm) {
      prefsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const freq = document.getElementById('refillFrequencySelect')?.value;
        const slot = document.getElementById('refillDeliverySlotSelect')?.value;
        const addr = document.getElementById('refillDeliveryAddressInput')?.value;

        savePreferences({
          cycle_frequency: freq,
          delivery_slot: slot,
          delivery_address: addr
        });
      });
    }
  }

  // DOM Content Loaded Handler
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkAuthAndInit();
      setupFormListeners();
    });
  } else {
    checkAuthAndInit();
    setupFormListeners();
  }

  function openSlotEdit(slotKey) {
    if (!state.isLoggedIn) {
      notify('Please sign in to edit your refill kit.', 'lock');
      if (window.LaxmiAuth) window.LaxmiAuth.openModal('signin');
      return;
    }
    const items = state.items.filter(i => i.slot === slotKey);
    if (items.length > 0) {
      openEditModal(items[0].id);
    } else {
      openAddModal(slotKey);
    }
  }

  // Public API
  window.RefillsManager = {
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openSlotEdit,
    selectModalSlot,
    selectEditModalSlot,
    setEditModalDosage,
    setModalDosage,
    handleAddFormSubmit,
    handleEditFormSubmit,
    toggleMedicineTaken,
    removeMedicine,
    updateMedicine,
    loadStarterKit,
    addKitToCart,
    handle1ClickRenew,
    savePreferences,
    refresh: () => state.user && fetchUserData(state.user.id)
  };

})();
