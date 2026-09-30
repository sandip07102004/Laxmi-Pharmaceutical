const express = require('express');
const router = express.Router();
const { sendPharmacistConsultNotification } = require('../services/emailService');

// In-memory consultations log (and can also save to DB if needed)
const consultLog = [];

// Validation helper for Indian Mobile Number
function validateIndianMobile(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, error: 'Mobile number is required.' };
  }
  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Mobile number is required.' };
  }
  if (/[^\d\s+\-().]/.test(trimmed)) {
    return { isValid: false, error: 'Mobile number can only contain digits.' };
  }

  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return { isValid: false, error: `Mobile number must be exactly 10 digits (received ${digits.length}).` };
  }
  if (!/^[6-9]/.test(digits)) {
    return { isValid: false, error: 'Valid Indian mobile numbers must start with 6, 7, 8, or 9.' };
  }
  if (/^(\d)\1{9}$/.test(digits)) {
    return { isValid: false, error: 'Please enter a genuine mobile number, not repeated digits.' };
  }

  const dummyNumbers = [
    '1234567890', '0123456789', '9876543210', '0987654321',
    '9898989898', '9090909090', '9191919191', '8989898989',
    '7878787878', '6767676767', '9988776655', '1122334455',
    '1212121212'
  ];
  if (dummyNumbers.includes(digits)) {
    return { isValid: false, error: 'Please enter a genuine, active 10-digit mobile number.' };
  }

  const uniqueDigits = new Set(digits.split('')).size;
  if (uniqueDigits <= 2) {
    return { isValid: false, error: 'Please enter a genuine, active 10-digit mobile number.' };
  }

  return { isValid: true, normalized: digits };
}

// POST /api/consult/callback (or POST /api/consult)
router.post('/callback', async (req, res) => {
  try {
    const { patientName, patientPhone, patientEmail, consultNature, symptoms } = req.body;

    // 1. Validation
    if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: patientName is required and must be at least 2 characters.'
      });
    }

    const phoneCheck = validateIndianMobile(patientPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${phoneCheck.error}`
      });
    }

    const consultData = {
      id: `CB-${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim(),
      patientPhone: phoneCheck.normalized,
      patientEmail: patientEmail ? patientEmail.trim() : '',
      consultNature: consultNature ? consultNature.trim() : 'Prescription Clarification',
      symptoms: symptoms ? symptoms.trim() : '',
      createdAt: new Date().toISOString(),
      status: 'pending_callback'
    };

    consultLog.push(consultData);

    // 2. Trigger asynchronous email notification via Resend
    setImmediate(async () => {
      try {
        await sendPharmacistConsultNotification(consultData);
      } catch (err) {
        console.error('[Consult Route] Async email error:', err);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Callback request registered successfully and email dispatched to Chief Pharmacist.',
      requestId: consultData.id,
      consult: consultData
    });

  } catch (error) {
    console.error('[Consult Callback Error]', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while scheduling callback.',
      details: error.message
    });
  }
});

// GET /api/consult/requests (Helper to view logged requests)
router.get('/requests', (req, res) => {
  res.json({
    success: true,
    count: consultLog.length,
    requests: consultLog
  });
});

module.exports = router;
