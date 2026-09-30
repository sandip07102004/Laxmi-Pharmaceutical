const express = require('express');
const router = express.Router();
const { saveOrder, getOrders } = require('../models/Order');
const { sendAdminOrderNotification } = require('../services/emailService');

// POST /api/checkout
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      customerPhone,
      email,
      address,
      deliveryAddress,
      items,
      totalPrice,
      orderType,
      fulfillmentType,
      deliveryType,
      refillDetails
    } = req.body;
    const rawPhone = (phone || customerPhone || '').toString().trim();
    const finalFulfillmentType = (fulfillmentType || deliveryType || 'takeaway').toString().toLowerCase() === 'delivery' ? 'delivery' : 'takeaway';
    const finalAddress = finalFulfillmentType === 'takeaway'
      ? (address || deliveryAddress || 'Store Takeaway / Pickup (Flagship Apothecary)').toString().trim()
      : (address || deliveryAddress || '').toString().trim();

    // 1. Validation
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: customerName (patient name) is required and must be at least 2 characters.'
      });
    }

    // Validation helper for Indian Mobile Number
    const validateMobile = (phoneStr) => {
      if (!phoneStr || typeof phoneStr !== 'string') return { isValid: false, error: 'Mobile number is required.' };
      const trimmed = phoneStr.trim();
      if (!trimmed) return { isValid: false, error: 'Mobile number is required.' };
      if (/[^\d\s+\-().]/.test(trimmed)) return { isValid: false, error: 'Mobile number can only contain digits.' };

      let digits = trimmed.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

      if (digits.length !== 10) return { isValid: false, error: `Mobile number must be exactly 10 digits (received ${digits.length}).` };
      if (!/^[6-9]/.test(digits)) return { isValid: false, error: 'Valid Indian mobile numbers must start with 6, 7, 8, or 9.' };
      if (/^(\d)\1{9}$/.test(digits)) return { isValid: false, error: 'Please enter a genuine mobile number, not repeated digits.' };

      const dummyNumbers = [
        '1234567890', '0123456789', '9876543210', '0987654321',
        '9898989898', '9090909090', '9191919191', '8989898989',
        '7878787878', '6767676767', '9988776655', '1122334455',
        '1212121212'
      ];
      if (dummyNumbers.includes(digits)) return { isValid: false, error: 'Please enter a genuine, active 10-digit mobile number.' };

      const uniqueDigits = new Set(digits.split('')).size;
      if (uniqueDigits <= 2) return { isValid: false, error: 'Please enter a genuine, active 10-digit mobile number.' };

      return { isValid: true, normalized: digits };
    };

    const phoneCheck = validateMobile(rawPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${phoneCheck.error}`
      });
    }
    const normalizedPhone = phoneCheck.normalized;

    // Email is optional — normalize to '-' if not provided or invalid
    let normalizedEmail = '-';
    if (email && typeof email === 'string' && email.includes('@')) {
      normalizedEmail = email.trim().toLowerCase();
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: items must be a non-empty array of products.'
      });
    }

    if (totalPrice === undefined || totalPrice === null || isNaN(Number(totalPrice)) || Number(totalPrice) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: totalPrice must be a valid non-negative number.'
      });
    }

    // Determine if this is a refill kit order or a regular store order
    const isRefill = (orderType === 'refill') || 
      (items && items.some(i => i.isRefill || i.categoryLabel === 'Refill Kit' || i.slot));
    const finalOrderType = isRefill ? 'refill' : 'regular';

    // Sanitize items with support for quantity, qty, and slot
    const sanitizedItems = items.map((item, index) => {
      const q = Math.max(1, Math.floor(Number(item.quantity !== undefined ? item.quantity : item.qty) || 1));
      return {
        id: item.id || `item-${index + 1}`,
        name: item.name || `Medicine Item #${index + 1}`,
        price: Number(item.price) || 0,
        quantity: q,
        dosage: item.dosage || '',
        pack: item.pack || '',
        slot: item.slot || ''
      };
    });

    // 2. Save order into the database with explicit orderType and refill context
    const orderData = {
      customerName: customerName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      address: finalAddress,
      fulfillmentType: finalFulfillmentType,
      orderType: finalOrderType,
      refillDetails: isRefill ? (refillDetails || {}) : undefined,
      items: sanitizedItems,
      totalPrice: Number(totalPrice),
      status: 'confirmed'
    };

    const savedOrder = await saveOrder(orderData);

    // 3. Trigger email notification to dedicated desk via Resend
    let emailResult = null;
    try {
      emailResult = await sendAdminOrderNotification(savedOrder);
      console.log(`[Checkout] ${finalOrderType.toUpperCase()} order notification result:`, emailResult);
    } catch (err) {
      console.error(`[Checkout] ${finalOrderType.toUpperCase()} order email dispatch error:`, err);
    }

    return res.status(201).json({
      success: true,
      message: `${finalOrderType === 'refill' ? 'Chronic Refill kit' : 'Regular'} order (${finalFulfillmentType === 'takeaway' ? 'Store Takeaway' : 'Home Delivery'}) placed successfully and confirmation email dispatched.`,
      order: {
        id: savedOrder._id,
        orderType: savedOrder.orderType,
        fulfillmentType: savedOrder.fulfillmentType || finalFulfillmentType,
        customerName: savedOrder.customerName,
        phone: savedOrder.phone,
        email: savedOrder.email,
        address: savedOrder.address,
        totalPrice: savedOrder.totalPrice,
        itemsCount: savedOrder.items.length,
        createdAt: savedOrder.createdAt,
        emailStatus: emailResult
      }
    });

  } catch (error) {
    console.error('[Checkout Error]', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing checkout.',
      details: error.message
    });
  }
});

// GET /api/checkout/orders (Helper to inspect orders)
router.get('/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
