// email.js — outbound mail for newsletter subscriptions.
// Configure SMTP_* env vars to enable; otherwise logs and skips.

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const FROM = process.env.NEWSLETTER_FROM || 'bookings@ille.co';
const SITE_URL = (process.env.SITE_URL || 'http://localhost:4200').replace(/\/$/, '');

let transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function siteUrl() {
  return SITE_URL;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getTransporter() {
  if (!isConfigured()) {
    console.log('[email] SMTP not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS)');
    return null;
  }
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    console.log('[email] creating transporter', {
      host,
      port,
      secure,
      user: process.env.SMTP_USER,
      passSet: !!process.env.SMTP_PASS,
      // force IPv4 — Office365 often returns IPv6 that fails with ENETUNREACH on Windows
      family: 4,
    });
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      // Prefer IPv4 so smtp.office365.com does not hang on unreachable IPv6
      family: 4,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      logger: true,
      debug: true,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

function logoUrl() {
  return `${SITE_URL}/assets/ille-logo-black.png`;
}

function wrapHtml(bodyHtml, unsubscribeToken) {
  const footer = unsubscribeToken ? unsubscribeFooter(unsubscribeToken) : '';
  const logo = logoUrl();
  // Table-based layout for Outlook/Gmail; keep styles inline.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ille</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff;">
          <tr>
            <td align="center" style="padding:36px 40px 20px 40px;border-bottom:1px solid #eee;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${logo}" width="120" alt="ille" style="display:block;width:120px;height:auto;border:0;outline:none;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1a1a1a;text-align:left;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px 40px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1a1a1a;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function unsubscribeFooter(token) {
  const url = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid #eee;">
      <tr>
        <td style="padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#888888;">
          You're receiving this because you subscribed at ille.
          <a href="${url}" style="color:#888888;text-decoration:underline;">Unsubscribe</a>
        </td>
      </tr>
    </table>`;
}

function textToHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email] SMTP not configured — would send to ${to}: ${subject}`);
    return { ok: false, skipped: true };
  }

  console.log('[email] sendMail start', { from: FROM, to, subject });

  try {
    // Do NOT pass a callback here — with a callback, await resolves immediately
    // and you never see success/error logs in the debugger.
    const info = await t.sendMail({ from: FROM, to, subject, html, text });
    console.log('[email] sendMail ok', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email] sendMail failed', {
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      address: err.address,
      port: err.port,
      message: err.message,
    });
    throw err;
  }
}

async function sendWelcome(email, token, topic = 'models') {
  const isCommunity = topic === 'community';
  const subject = isCommunity
    ? 'Welcome to the ille community'
    : 'Thank you for joining ille updates';
  const headline = isCommunity ? 'Welcome to the community' : 'Thank you for subscribing';
  const body = isCommunity
    ? `
      <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1a1a1a;">
        ${headline}
      </p>
      <p style="margin:0 0 14px 0;">Thank you for joining the ille community.</p>
      <p style="margin:0 0 14px 0;">We're glad you're here. You'll be among the first to hear about our model camps, workshops, and the moments that bring our world together.</p>
      <p style="margin:0 0 14px 0;">We can't wait to share what's next with you.</p>
      <p style="margin:28px 0 0 0;">Warmly,<br><span style="letter-spacing:0.04em;">ille</span></p>
    `
    : `
      <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1a1a1a;">
        ${headline}
      </p>
      <p style="margin:0 0 14px 0;">Thank you for subscribing to ille model updates.</p>
      <p style="margin:0 0 14px 0;">You'll be the first to discover new faces as they join our roster — carefully chosen, quietly announced, and shared with you before anyone else.</p>
      <p style="margin:0 0 14px 0;">We're happy to have you with us.</p>
      <p style="margin:28px 0 0 0;">Warmly,<br><span style="letter-spacing:0.04em;">ille</span></p>
    `;
  const html = wrapHtml(body, token);
  const text = isCommunity
    ? [
        'Welcome to the community',
        '',
        'Thank you for joining the ille community.',
        '',
        "We're glad you're here. You'll be among the first to hear about our model camps, workshops, and the moments that bring our world together.",
        '',
        "We can't wait to share what's next with you.",
        '',
        'Warmly,',
        'ille',
      ].join('\n')
    : [
        'Thank you for subscribing',
        '',
        'Thank you for subscribing to ille model updates.',
        '',
        "You'll be the first to discover new faces as they join our roster — carefully chosen, quietly announced, and shared with you before anyone else.",
        '',
        "We're happy to have you with us.",
        '',
        'Warmly,',
        'ille',
      ].join('\n');
  return sendMail({ to: email, subject, html, text });
}

async function sendNewModelNotice(email, token, model) {
  const profileUrl = `${SITE_URL}/model/${model.id}`;
  const subject = `New model — ${model.name}`;
  const html = wrapHtml(`
    <p>We've just added a new model to our roster:</p>
    <p><strong>${model.name}</strong></p>
    <p><a href="${profileUrl}" style="color:#1a1a1a;">View profile →</a></p>
  `, token);
  const text = `New model at ille: ${model.name}\n\nView profile: ${profileUrl}`;
  return sendMail({ to: email, subject, html, text });
}

async function sendBroadcast(email, token, subject, message) {
  const html = wrapHtml(`<div>${textToHtml(message)}</div>`, token);
  const text = message;
  return sendMail({ to: email, subject, html, text });
}

async function sendBookingNotification(booking) {
  const to = process.env.BOOKINGS_NOTIFY_EMAIL || 'bookings@ille.co';
  const subject = `New booking enquiry — ${booking.clientName || 'Unknown'}`;
  const rows = [
    ['Client', booking.clientName],
    ['Company', booking.company],
    ['Email', booking.email],
    ['Phone', booking.phone],
    ['Job Type', booking.jobType],
    ['Location', booking.location],
    ['Dates', booking.dates],
    ['Budget', booking.budget],
    ['Model ID', booking.modelId],
    ['Message', booking.message],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">${k}</td><td style="padding:4px 0;">${textToHtml(String(v))}</td></tr>`)
    .join('');
  const html = wrapHtml(`
    <p>A new booking enquiry has been submitted.</p>
    <table style="border-collapse:collapse;">${rows}</table>
  `);
  const text = [
    'New booking enquiry submitted.',
    '',
    ...Object.entries(booking).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
  ].join('\n');
  console.log('[email] sendBookingNotification', { to, subject });
  return sendMail({ to, subject, html, text });
}

async function sendApplicationNotification(application) {
  const to = process.env.BOOKINGS_NOTIFY_EMAIL || 'bookings@ille.co';
  const name = [application.firstName, application.lastName].filter(Boolean).join(' ') || 'Unknown';
  const subject = `New model application — ${name}`;
  const rows = [
    ['Name', name],
    ['Email', application.email],
    ['Phone', application.phone],
    ['Date of Birth', application.dateOfBirth],
    ['Height', application.height],
    ['Instagram', application.instagram],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">${k}</td><td style="padding:4px 0;">${textToHtml(String(v))}</td></tr>`)
    .join('');
  const html = wrapHtml(`
    <p>A new model application has been submitted.</p>
    <table style="border-collapse:collapse;">${rows}</table>
    <p style="color:#888;font-size:12px;">Log in to the admin panel to view the submitted photos.</p>
  `);
  const text = [
    'New model application submitted.',
    '',
    `Name: ${name}`,
    application.email ? `Email: ${application.email}` : '',
    application.phone ? `Phone: ${application.phone}` : '',
    application.instagram ? `Instagram: ${application.instagram}` : '',
  ].filter(Boolean).join('\n');
  return sendMail({ to, subject, html, text });
}

async function notifySubscribers(subscribers, sendFn) {
  let sent = 0;
  let skipped = 0;
  for (const sub of subscribers) {
    try {
      const result = await sendFn(sub);
      if (result.skipped) skipped++;
      else sent++;
    } catch (err) {
      console.error(`[email] Failed to send to ${sub.email}:`, err.message);
    }
  }
  return { sent, skipped, total: subscribers.length };
}

module.exports = {
  isConfigured,
  siteUrl,
  generateToken,
  sendWelcome,
  sendNewModelNotice,
  sendBroadcast,
  sendBookingNotification,
  sendApplicationNotification,
  notifySubscribers,
};
