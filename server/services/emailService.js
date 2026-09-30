const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Resend } = require('resend');

const getResendClient = (apiKeyOverride) => {
  const apiKey = apiKeyOverride || process.env.PRIMARY_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.warn('[Email Warning] RESEND_API_KEY is missing or unconfigured in environment.');
    return null;
  }
  return new Resend(apiKey);
};

/**
 * Smart Email Dispatcher with Automatic Quota/Limit Failover
 * Sends all emails to the unified admin inbox (laxmi.pharma.help@gmail.com).
 * If the dedicated/primary API key hits its limit or encounters an issue,
 * it seamlessly and automatically dispatches via the alternate backup API key.
 */
const sendEmailWithFailover = async ({
  from,
  to,
  subject,
  html,
  preferredApiKey,
  alternateApiKey,
  logContext = 'Notification'
}) => {
  const PRIMARY_DESTINATION = 'laxmi.pharma.help@gmail.com';
  const primaryRecipient = PRIMARY_DESTINATION;
  const backupRecipient = PRIMARY_DESTINATION;

  const primaryKey = preferredApiKey || process.env.PRIMARY_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const alternateKey = alternateApiKey || process.env.BACKUP_RESEND_API_KEY || process.env.ALTERNATE_RESEND_API_KEY;

  const primaryClient = getResendClient(primaryKey);
  const alternateClient = getResendClient(alternateKey);

  if (!primaryClient && !alternateClient) {
    console.warn(`[Email Service] Cannot dispatch ${logContext}: No Resend API client available.`);
    return { skipped: true, reason: 'Missing RESEND_API_KEY' };
  }

  // 1. First attempt: Send with Primary / Dedicated API Key
  if (primaryClient) {
    try {
      let targetRecipient = PRIMARY_DESTINATION;
      let response = await primaryClient.emails.send({
        from,
        to: [targetRecipient],
        subject,
        html
      });

      if (!response.error) {
        console.log(`[Email Service] ✅ ${logContext} sent successfully via Primary API to ${targetRecipient}:`, response.data);
        return { success: true, data: response.data, recipient: targetRecipient, provider: 'primary' };
      }

      console.warn(`[Email Service Warning] ⚠️ Primary API issue for ${logContext} (${response.error.message || response.error}). Triggering Alternate API failover...`);

      // 2. Failover: If Primary API has an error (quota, limit, rate limit), switch to Alternate API
      if (alternateClient && alternateKey && alternateKey !== primaryKey) {
        console.log(`[Email Service Failover] 🔄 Primary limit or error detected. Automatically switching to Alternate Backup API for ${logContext}...`);
        let altRecipient = PRIMARY_DESTINATION;

        let backupResponse = await alternateClient.emails.send({
          from,
          to: [altRecipient],
          subject,
          html
        });

        if (!backupResponse.error) {
          console.log(`[Email Service] ✅ ${logContext} delivered successfully via Alternate Backup API to ${altRecipient}:`, backupResponse.data);
          return { success: true, data: backupResponse.data, recipient: altRecipient, provider: 'alternate_failover' };
        } else {
          console.error(`[Email Service Error] ❌ Alternate Backup API also returned error:`, backupResponse.error);
          return { success: false, error: backupResponse.error.message || backupResponse.error };
        }
      }

      return { success: false, error: response.error.message || response.error };
    } catch (primaryErr) {
      console.warn(`[Email Service Warning] ⚠️ Primary API exception for ${logContext}: ${primaryErr.message}. Trying Alternate Backup API...`);
      if (alternateClient && alternateKey && alternateKey !== primaryKey) {
        try {
          let altRecipient = primaryRecipient;
          let backupResponse = await alternateClient.emails.send({
            from,
            to: [altRecipient],
            subject,
            html
          });
          if (backupResponse.error) {
            const bErr = (backupResponse.error.message || JSON.stringify(backupResponse.error)).toLowerCase();
            if (bErr.includes('only send testing emails') && altRecipient !== backupRecipient) {
              altRecipient = backupRecipient;
              backupResponse = await alternateClient.emails.send({ from, to: [altRecipient], subject, html });
            }
          }
          if (!backupResponse.error) {
            console.log(`[Email Service] ✅ ${logContext} delivered successfully via Alternate Backup API to ${altRecipient}:`, backupResponse.data);
            return { success: true, data: backupResponse.data, recipient: altRecipient, provider: 'alternate_failover' };
          }
        } catch (altErr) {
          console.error(`[Email Service Error] ❌ Alternate API exception:`, altErr.message);
        }
      }
      return { success: false, error: primaryErr.message };
    }
  }

  // If primaryClient was not available, try alternateClient directly
  if (alternateClient) {
    try {
      const response = await alternateClient.emails.send({ from, to: [primaryRecipient], subject, html });
      if (!response.error) {
        return { success: true, data: response.data, recipient: primaryRecipient, provider: 'alternate' };
      }
      return { success: false, error: response.error.message || response.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { skipped: true, reason: 'Failed all dispatch attempts' };
};

const generateOrderEmailHtml = (order) => {
  const itemsRows = (order.items || []).map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td class="item-cell item-name" style="padding: 10px 8px; font-weight: 600; color: #1a202c; word-break: break-word;">${item.name || 'Medicine'}</td>
      <td class="item-cell item-qty" style="padding: 10px 8px; text-align: center; color: #4a5568;">${item.quantity || 1}</td>
      <td class="item-cell item-unit" style="padding: 10px 8px; text-align: right; color: #4a5568; white-space: nowrap;">₹${Number(item.price || 0).toFixed(2)}</td>
      <td class="item-cell item-total" style="padding: 10px 8px; text-align: right; font-weight: 600; color: #005c55; white-space: nowrap;">₹${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
    </tr>
  `).join('');

  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <meta name="x-apple-disable-message-reformatting">
      <title>New Order Received</title>
      <style>
        /* Mobile-Responsive Email Styles */
        body {
          margin: 0 !important;
          padding: 12px 8px !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
        }
        table {
          border-collapse: collapse !important;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 8px !important;
          }
          .header-padding {
            padding: 18px 16px !important;
          }
          .body-padding {
            padding: 18px 14px !important;
          }
          .footer-padding {
            padding: 14px 16px !important;
          }
          .order-meta-table td {
            display: block !important;
            width: 100% !important;
            text-align: left !important;
            box-sizing: border-box !important;
          }
          .order-meta-date {
            margin-top: 10px !important;
            text-align: left !important;
          }
          .item-cell {
            padding: 8px 6px !important;
            font-size: 13px !important;
          }
          .item-name {
            font-size: 13px !important;
          }
          .total-display {
            font-size: 20px !important;
          }
        }
      </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 16px 8px; color: #2d3748; -webkit-text-size-adjust: 100%;">
      <div class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div class="header-padding" style="background: linear-gradient(135deg, #005c55 0%, #00423d 100%); color: #ffffff; padding: 24px 28px;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px; color: #ffffff;">Laxmi Pharma · Order Notification</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a3faef;">New customer order received & pending pharmacist review</p>
        </div>

        <!-- Order Summary Details -->
        <div class="body-padding" style="padding: 24px 28px;">
          <!-- Order Metadata Table (Email-Safe Table instead of unsupported flexbox) -->
          <table class="order-meta-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; border-bottom: 1px dashed #cbd5e0; padding-bottom: 14px;">
            <tr>
              <td align="left" valign="top" style="padding-bottom: 6px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; letter-spacing: 0.5px;">Order ID</div>
                <div style="font-size: 15px; font-weight: 700; color: #1a202c; font-family: monospace;">#${order._id}</div>
              </td>
              <td class="order-meta-date" align="right" valign="top" style="padding-bottom: 6px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; letter-spacing: 0.5px;">Date & Time</div>
                <div style="font-size: 13px; color: #4a5568;">${orderDate} IST</div>
              </td>
            </tr>
          </table>

          <!-- Customer Information Box -->
          <div style="background: #f0fdf9; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px; border: 1px solid #ccfbf1;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 11px; text-transform: uppercase; color: #0f766e; font-weight: 700; letter-spacing: 0.5px;">Customer &amp; Fulfillment Details</span>
              ${order.fulfillmentType === 'delivery' ? `
                <span style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #047857;">🚚 HOME DELIVERY</span>
              ` : `
                <span style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #0369a1;">🏪 STORE TAKEAWAY / PICKUP</span>
              `}
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #115e59;">${order.customerName}</div>
            ${order.phone ? `
            <div style="font-size: 13px; color: #0f766e; margin-top: 4px;">
              <strong>Mobile:</strong> <a href="tel:+91${order.phone}" style="color: #005c55; font-weight: 700; text-decoration: underline;">+91 ${order.phone}</a>
            </div>
            ` : ''}
            ${order.fulfillmentType === 'delivery' ? `
            <div style="font-size: 13px; color: #0f766e; margin-top: 4px;">
              <strong>Delivery Address:</strong> <span style="color: #115e59; font-weight: 600;">${order.address || 'Address provided at checkout'}</span>
            </div>
            ` : `
            <div style="font-size: 13px; color: #0f766e; margin-top: 4px;">
              <strong>Pickup Method:</strong> <span style="color: #0369a1; font-weight: 700;">Store Takeaway / Pickup at Flagship Counter (~15 mins)</span>
            </div>
            `}
            <div style="font-size: 13px; color: #0d9488; margin-top: 3px; word-break: break-all;">
              Email: ${(order.email && order.email !== '-' && order.email.includes('@') && !order.email.includes('@customer.laxmipharma.in')) ? `<a href="mailto:${order.email}" style="color: #005c55; text-decoration: underline;">${order.email}</a>` : '-'}
            </div>
          </div>

          <!-- Items Table -->
          <div style="width: 100%; overflow-x: auto;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
              <thead>
                <tr style="background: #edf2f7; color: #4a5568; font-size: 12px; text-transform: uppercase;">
                  <th class="item-cell" style="padding: 10px 8px; text-align: left; letter-spacing: 0.5px;">Item</th>
                  <th class="item-cell" style="padding: 10px 8px; text-align: center; letter-spacing: 0.5px;">Qty</th>
                  <th class="item-cell" style="padding: 10px 8px; text-align: right; letter-spacing: 0.5px;">Unit Price</th>
                  <th class="item-cell" style="padding: 10px 8px; text-align: right; letter-spacing: 0.5px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Total Calculation -->
          <div style="text-align: right; border-top: 2px solid #e2e8f0; padding-top: 14px; margin-top: 10px;">
            <div style="font-size: 13px; color: #718096; margin-bottom: 4px;">Total Amount Payable:</div>
            <div class="total-display" style="font-size: 22px; font-weight: 800; color: #005c55;">₹${Number(order.totalPrice || 0).toFixed(2)}</div>
          </div>
        </div>

        <!-- Footer Notice -->
        <div class="footer-padding" style="background: #edf2f7; padding: 14px 24px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0;">
          This is an automated notification from the Laxmi Pharma e-commerce checkout service.
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateConsultEmailHtml = (consult) => {
  const requestDate = consult.createdAt 
    ? new Date(consult.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pharmacist Callback Request</title>
      <style>
        body {
          margin: 0 !important;
          padding: 12px 8px !important;
          background-color: #f0fdf4 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        table { border-collapse: collapse !important; }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0, 92, 85, 0.08);
          border: 1px solid #d1fae5;
        }
        .header {
          background: linear-gradient(135deg, #005c55 0%, #003733 100%);
          color: #ffffff;
          padding: 24px;
          text-align: center;
        }
        .badge {
          display: inline-block;
          background: #6CF8BB;
          color: #003733;
          font-weight: 800;
          font-size: 11px;
          padding: 4px 12px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .body-padding { padding: 24px; }
        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #edf2f7;
          font-size: 14px;
        }
        .field-row:last-child { border-bottom: none; }
        .label { font-weight: 700; color: #4a5568; min-width: 140px; }
        .value { color: #1a202c; text-align: right; font-weight: 600; }
        .call-btn {
          display: block;
          width: 100%;
          background: #005c55;
          color: #ffffff !important;
          text-align: center;
          padding: 14px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          box-sizing: border-box;
          margin-top: 18px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <span class="badge">📞 Instant Callback Request</span>
          <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">Laxmi Pharma Consult Desk</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #9cf2e8;">A patient has requested an urgent pharmacist consultation</p>
        </div>

        <!-- Body -->
        <div class="body-padding">
          <div style="margin-bottom: 18px; font-size: 13px; color: #718096; display: flex; justify-content: space-between;">
            <span>Request ID: <strong style="color: #005c55;">#${consult.id || consult._id || 'CB-' + Date.now().toString().slice(-6)}</strong></span>
            <span>Date: <strong>${requestDate}</strong></span>
          </div>

          <!-- Patient Contact Info Card -->
          <div class="card">
            <h4 style="margin: 0 0 12px; font-size: 14px; color: #005c55; text-transform: uppercase; letter-spacing: 0.5px;">Patient Contact Details</h4>
            
            <div style="font-size: 14px; margin-bottom: 8px;">
              <span style="color: #718096;">Patient Name:</span>
              <strong style="color: #1a202c; margin-left: 8px; font-size: 15px;">${consult.patientName}</strong>
            </div>

            <div style="font-size: 14px; margin-bottom: 8px;">
              <span style="color: #718096;">Mobile Phone:</span>
              <a href="tel:${consult.patientPhone}" style="color: #005c55; font-weight: 800; margin-left: 8px; text-decoration: underline; font-size: 16px;">${consult.patientPhone}</a>
            </div>

            ${consult.patientEmail ? `
              <div style="font-size: 14px; margin-bottom: 8px;">
                <span style="color: #718096;">Email Address:</span>
                <span style="color: #1a202c; margin-left: 8px; font-weight: 600;">${consult.patientEmail}</span>
              </div>
            ` : ''}

            <div style="font-size: 14px;">
              <span style="color: #718096;">Consultation Category:</span>
              <span style="background: #e6fffa; color: #005c55; padding: 2px 8px; border-radius: 6px; font-weight: 700; margin-left: 8px;">${consult.consultNature || 'Prescription Clarification'}</span>
            </div>
          </div>

          <!-- Description / Symptoms -->
          <div class="card" style="background: #fff; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 8px; font-size: 13px; color: #475569; text-transform: uppercase;">Patient Query / Symptoms:</h4>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #005c55;">
              ${consult.symptoms ? consult.symptoms.replace(/\n/g, '<br>') : 'No extra details provided. Patient requested direct callback on phone.'}
            </p>
          </div>

          <!-- Direct Call Trigger Button -->
          <a href="tel:${consult.patientPhone}" class="call-btn">
            📞 Dial Patient Directly (${consult.patientPhone})
          </a>

          <div style="text-align: center; margin-top: 14px; font-size: 12px; color: #64748b;">
            Target Callback SLA: Within 10 Minutes · Pharmacist Consult Desk
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #edf2f7; padding: 12px 20px; font-size: 11px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0;">
          Laxmi Pharmaceuticals Ltd. · Automated Clinical Triage Notification
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendPharmacistConsultNotification = async (consult) => {
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const targetEmail = process.env.CONSULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'laxmi.pharma.help@gmail.com';
  const htmlContent = generateConsultEmailHtml(consult);

  return await sendEmailWithFailover({
    from: `Laxmi Pharma Consult Desk <${senderEmail}>`,
    to: targetEmail,
    subject: `📞 Pharmacist Callback Request: ${consult.patientName} (${consult.patientPhone})`,
    html: htmlContent,
    preferredApiKey: process.env.CONSULT_RESEND_API_KEY || process.env.PRIMARY_RESEND_API_KEY,
    alternateApiKey: process.env.BACKUP_RESEND_API_KEY || process.env.ALTERNATE_RESEND_API_KEY,
    logContext: `Pharmacist Callback Request [${consult.id || 'CB'}]`
  });
};

const generateRefillEmailHtml = (order) => {
  const itemsRows = (order.items || []).map(item => {
    const slotTag = item.slot ? ` <span style="display: inline-block; font-size: 11px; background: #e6fffa; color: #0f766e; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px;">${item.slot.toUpperCase()}</span>` : '';
    return `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td class="item-cell item-name" style="padding: 10px 8px; font-weight: 600; color: #1a202c; word-break: break-word;">
        ${item.name || 'Refill Medicine'}${slotTag}
        ${item.dosage ? `<div style="font-size: 12px; color: #718096; font-weight: 400; margin-top: 2px;">${item.dosage}</div>` : ''}
        ${item.pack ? `<div style="font-size: 11px; color: #0d9488; font-weight: 500;">${item.pack}</div>` : ''}
      </td>
      <td class="item-cell item-qty" style="padding: 10px 8px; text-align: center; color: #4a5568;">${item.quantity || 1}</td>
      <td class="item-cell item-unit" style="padding: 10px 8px; text-align: right; color: #4a5568; white-space: nowrap;">₹${Number(item.price || 0).toFixed(2)}</td>
      <td class="item-cell item-total" style="padding: 10px 8px; text-align: right; font-weight: 600; color: #005c55; white-space: nowrap;">₹${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const refillDetails = order.refillDetails || {};
  const cycleFreq = refillDetails.cycleFrequency || 'Every 30 Days (Standard Monthly)';
  const deliverySlot = refillDetails.deliverySlot || 'Morning (7:00 AM – 10:00 AM)';
  const nextDate = refillDetails.nextRefillDate || 'Due in 30 Days';

  // Group items by slot for pharmacist dispensing
  const morningItems = (order.items || []).filter(i => (i.slot || '').toLowerCase() === 'morning');
  const noonItems = (order.items || []).filter(i => ['noon', 'afternoon'].includes((i.slot || '').toLowerCase()));
  const nightItems = (order.items || []).filter(i => ['night', 'evening'].includes((i.slot || '').toLowerCase()));
  const generalItems = (order.items || []).filter(i => !['morning', 'noon', 'afternoon', 'night', 'evening'].includes((i.slot || '').toLowerCase()));

  const renderSlotList = (items) => {
    if (!items || items.length === 0) return '<div style="font-size: 12px; color: #a0aec0; font-style: italic;">No medicines in this slot</div>';
    return items.map(i => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0;">
        <span style="font-weight: 600; color: #1e293b;">• ${i.name}</span>
        <span style="color: #64748b; font-size: 12px;">${i.dosage || '1 dose'} · ${i.quantity || 1} pack</span>
      </div>
    `).join('');
  };

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <meta name="x-apple-disable-message-reformatting">
      <title>Monthly Chronic Refill Kit Order</title>
      <style>
        body {
          margin: 0 !important;
          padding: 12px 8px !important;
          background-color: #f7fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #2d3748;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100% !important;
        }
        table {
          border-collapse: collapse !important;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
        }
        .email-container {
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #ccfbf1;
          box-shadow: 0 4px 8px rgba(0,92,85,0.08);
        }
        .header {
          background: linear-gradient(135deg, #0f766e 0%, #004d40 100%);
          color: #ffffff;
          padding: 24px 28px;
        }
        .badge-refill {
          display: inline-block;
          background: #6CF8BB;
          color: #003733;
          font-weight: 800;
          font-size: 11px;
          padding: 4px 12px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 8px !important;
          }
          .header-padding {
            padding: 18px 16px !important;
          }
          .body-padding {
            padding: 18px 14px !important;
          }
          .footer-padding {
            padding: 14px 16px !important;
          }
          .order-meta-table td {
            display: block !important;
            width: 100% !important;
            text-align: left !important;
            box-sizing: border-box !important;
          }
          .order-meta-date {
            margin-top: 10px !important;
            text-align: left !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header-padding header">
          <span class="badge-refill">💊 Chronic Care Refill Kit</span>
          <h2 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">Laxmi Pharma · Refill Desk</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #a3faef;">Monthly automated chronic medication kit order received</p>
        </div>

        <div class="body-padding" style="padding: 24px 28px;">
          <!-- Order Metadata Table (Email-Safe Table matching Order Email layout) -->
          <table class="order-meta-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; border-bottom: 1px dashed #cbd5e0; padding-bottom: 14px;">
            <tr>
              <td align="left" valign="top" style="padding-bottom: 6px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; letter-spacing: 0.5px;">Refill Order ID</div>
                <div style="font-size: 15px; font-weight: 700; color: #004d40; font-family: monospace;">#${order._id}</div>
              </td>
              <td class="order-meta-date" align="right" valign="top" style="padding-bottom: 6px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; letter-spacing: 0.5px;">Date & Time</div>
                <div style="font-size: 13px; color: #4a5568;">${orderDate} IST</div>
              </td>
            </tr>
          </table>

          <!-- Refill Cycle Schedule Box -->
          <div style="background: #f0fdf9; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; border: 1.5px solid #a7f3d0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #0f766e; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 8px;">
              🗓️ Patient Refill Schedule Preferences
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 13px;">
              <div><strong>Refill Frequency:</strong> <span style="color: #047857; font-weight: 600;">${cycleFreq}</span></div>
              <div><strong>Delivery Slot Preference:</strong> <span style="color: #047857; font-weight: 600;">${deliverySlot}</span></div>
              <div><strong>Next Renewal Target:</strong> <span style="color: #047857; font-weight: 600;">${nextDate}</span></div>
            </div>
          </div>

          <!-- Customer / Patient Details -->
          <div style="background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Patient & Delivery Information</div>
            <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${order.customerName}</div>
            ${order.phone ? `
            <div style="font-size: 13px; color: #334155; margin-top: 4px;">
              <strong>Mobile Phone:</strong> <a href="tel:+91${order.phone}" style="color: #005c55; font-weight: 700; text-decoration: underline;">+91 ${order.phone}</a>
            </div>
            ` : ''}
            ${order.address ? `
            <div style="font-size: 13px; color: #047857; margin-top: 6px; background: #e6fffa; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #005c55;">
              <strong>Delivery Address:</strong> <span style="font-weight: 600;">${order.address}</span>
            </div>
            ` : ''}
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
              Email: ${(order.email && order.email !== '-' && order.email.includes('@') && !order.email.includes('@customer.laxmipharma.in')) ? `<a href="mailto:${order.email}" style="color: #005c55;">${order.email}</a>` : '-'}
            </div>
          </div>

          <!-- Pharmacist Pouch Packing & Regimen Guide -->
          <div style="background: #ffffff; border-radius: 8px; border: 1.5px solid #0d9488; padding: 14px 16px; margin-bottom: 22px;">
            <div style="font-size: 12px; text-transform: uppercase; color: #0f766e; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 12px;">
              📦 Pharmacist Pouch Dispensing Guide
            </div>

            <!-- Morning -->
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; font-weight: 700; color: #0369a1; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                🌅 Morning Dosing (8:00 AM)
              </div>
              <div style="margin-top: 6px; padding-left: 6px;">
                ${renderSlotList(morningItems)}
              </div>
            </div>

            <!-- Afternoon -->
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; font-weight: 700; color: #b45309; background: #fef3c7; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                ☀️ Afternoon Dosing (1:30 PM)
              </div>
              <div style="margin-top: 6px; padding-left: 6px;">
                ${renderSlotList(noonItems)}
              </div>
            </div>

            <!-- Night -->
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; font-weight: 700; color: #7e22ce; background: #f3e8ff; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                🌙 Night Dosing (8:30 PM)
              </div>
              <div style="margin-top: 6px; padding-left: 6px;">
                ${renderSlotList(nightItems)}
              </div>
            </div>

            ${generalItems.length > 0 ? `
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                📋 General / As Needed
              </div>
              <div style="margin-top: 6px; padding-left: 6px;">
                ${renderSlotList(generalItems)}
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Items Table -->
          <div style="width: 100%; overflow-x: auto; margin-bottom: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #edf2f7; color: #4a5568; font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 8px; text-align: left;">Medicine / Pouch Item</th>
                  <th style="padding: 10px 8px; text-align: center;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right;">Unit Price</th>
                  <th style="padding: 10px 8px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Total Calculation -->
          <div style="text-align: right; border-top: 2px solid #e2e8f0; padding-top: 14px;">
            <div style="font-size: 13px; color: #718096; margin-bottom: 4px;">Monthly Kit Total:</div>
            <div style="font-size: 22px; font-weight: 800; color: #005c55;">₹${Number(order.totalPrice || 0).toFixed(2)}</div>
            <div style="font-size: 12px; color: #0f766e; font-weight: 600; margin-top: 2px;">Pay on Verification (Cash / UPI)</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-padding" style="background: #edf2f7; padding: 14px 24px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0;">
          Laxmi Pharma Chronic Refill Management Desk · Dedicated Dispatch Notification
        </div>
      </div>
    </body>
    </html>
  `;
};

// 1. Regular Store Order Notification (with Automatic Limit Failover)
const sendRegularOrderNotification = async (order) => {
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const targetEmail = process.env.ORDER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'laxmi.pharma.help@gmail.com';
  const htmlContent = generateOrderEmailHtml(order);

  const isDelivery = order.fulfillmentType === 'delivery';
  const tag = isDelivery ? '🚚 Home Delivery' : '🏪 Store Takeaway';

  const result = await sendEmailWithFailover({
    from: `Laxmi Pharma Orders <${senderEmail}>`,
    to: targetEmail,
    subject: `🛒 [${tag}] Order #${order._id} - ₹${Number(order.totalPrice || 0).toFixed(2)} (${order.customerName})`,
    html: htmlContent,
    preferredApiKey: process.env.ORDER_RESEND_API_KEY || process.env.PRIMARY_RESEND_API_KEY,
    alternateApiKey: process.env.BACKUP_RESEND_API_KEY || process.env.ALTERNATE_RESEND_API_KEY,
    logContext: `Regular Store Order [#${order._id} - ${tag}]`
  });

  return { ...result, orderType: 'regular' };
};

// 2. Refill Kit Order Notification (with Automatic Limit Failover)
const sendRefillOrderNotification = async (order) => {
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const targetEmail = process.env.REFILL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'laxmi.pharma.help@gmail.com';
  const htmlContent = generateRefillEmailHtml(order);

  const result = await sendEmailWithFailover({
    from: `Laxmi Pharma Refill Care <${senderEmail}>`,
    to: targetEmail,
    subject: `💊 [Refill Kit Order] #${order._id} - ₹${Number(order.totalPrice || 0).toFixed(2)} (${order.customerName} · Monthly Refill)`,
    html: htmlContent,
    preferredApiKey: process.env.REFILL_RESEND_API_KEY || process.env.PRIMARY_RESEND_API_KEY,
    alternateApiKey: process.env.BACKUP_RESEND_API_KEY || process.env.ALTERNATE_RESEND_API_KEY,
    logContext: `Chronic Refill Kit Order [#${order._id}]`
  });

  return { ...result, orderType: 'refill' };
};

// Unified router: automatically inspects order type and routes to correct recipient & template
const sendAdminOrderNotification = async (order) => {
  const isRefill = (order.orderType === 'refill') || 
    (order.items && order.items.some(i => i.slot || (i.name && i.name.toLowerCase().includes('refill')) || i.categoryLabel === 'Refill Kit'));

  if (isRefill) {
    return await sendRefillOrderNotification(order);
  } else {
    return await sendRegularOrderNotification(order);
  }
};

module.exports = {
  sendAdminOrderNotification,
  sendRegularOrderNotification,
  sendRefillOrderNotification,
  generateOrderEmailHtml,
  generateRefillEmailHtml,
  sendPharmacistConsultNotification,
  generateConsultEmailHtml
};

