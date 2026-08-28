// email.js — outbound mail for newsletter subscriptions.
// Configure SMTP_* env vars to enable; otherwise logs and skips.

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FROM = process.env.NEWSLETTER_FROM || 'bookings@ille.co';
const NOTIFY_TO = process.env.BOOKINGS_NOTIFY_EMAIL || 'bookings@ille.co';
const INFO_FROM = process.env.INFO_FROM || 'info@ille.co';
const INFO_NOTIFY_TO = process.env.INFO_NOTIFY_EMAIL || 'info@ille.co';
const SITE_URL = (process.env.SITE_URL || 'https://ille.co').replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_CID = 'ille-logo@ille';
const LOGO_PATH = path.join(__dirname, 'assets', 'ille-logo-black.png');

const transporters = { bookings: null, info: null };

function isConfigured(account = 'bookings') {
  if (account === 'info') {
    return !!(
      (process.env.INFO_SMTP_HOST || process.env.SMTP_HOST) &&
      (process.env.INFO_SMTP_USER || process.env.SMTP_USER) &&
      (process.env.INFO_SMTP_PASS || process.env.SMTP_PASS)
    );
  }
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function siteUrl() {
  return SITE_URL;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function smtpConfig(account = 'bookings') {
  if (account === 'info') {
    return {
      host: process.env.INFO_SMTP_HOST || process.env.SMTP_HOST,
      port: Number(process.env.INFO_SMTP_PORT || process.env.SMTP_PORT || 587),
      secure: (process.env.INFO_SMTP_SECURE || process.env.SMTP_SECURE) === 'true',
      user: process.env.INFO_SMTP_USER || process.env.SMTP_USER,
      pass: process.env.INFO_SMTP_PASS || process.env.SMTP_PASS,
      from: INFO_FROM,
    };
  }
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: FROM,
  };
}

function getTransporter(account = 'bookings') {
  if (!isConfigured(account)) {
    console.log(`[email] SMTP not configured for ${account}`);
    return null;
  }
  if (!transporters[account]) {
    const cfg = smtpConfig(account);
    transporters[account] = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      // Prefer IPv4 so smtp.office365.com does not hang on unreachable IPv6
      family: 4,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
  }
  return transporters[account];
}

function logoAttachment() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.warn('[email] logo file missing:', LOGO_PATH);
    return null;
  }
  return {
    filename: 'ille-logo-black.png',
    path: LOGO_PATH,
    cid: LOGO_CID,
    contentType: 'image/png',
    contentDisposition: 'inline',
  };
}

function wrapHtml(bodyHtml, unsubscribeToken) {
  const footer = unsubscribeToken ? unsubscribeFooter(unsubscribeToken) : '';
  // Inline CID attachment — do not rely on SITE_URL/assets (404 on production WordPress).
  const logoSrc = `cid:${LOGO_CID}`;
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
                <img src="${logoSrc}" width="120" alt="ille" style="display:block;width:120px;height:auto;border:0;outline:none;">
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

function isSmtpAuthError(err) {
  const msg = String(err?.message || err?.response || '');
  return (
    err?.code === 'EAUTH' ||
    err?.responseCode === 535 ||
    /SmtpClientAuthentication is disabled/i.test(msg) ||
    /Authentication unsuccessful/i.test(msg)
  );
}

async function sendMailOnce(account, { to, subject, html, text, fromOverride = null }) {
  const t = getTransporter(account);
  const cfg = smtpConfig(account);
  const from = fromOverride || cfg.from;
  if (!t) {
    console.log(`[email] SMTP not configured for ${account} — would send to ${to}: ${subject}`);
    return { ok: false, skipped: true };
  }

  const attachments = [];
  const logo = logoAttachment();
  if (logo) attachments.push(logo);

  const info = await t.sendMail({
    from,
    sender: from,
    replyTo: from,
    to,
    subject,
    html,
    text,
    attachments,
  });
  return { ok: true, messageId: info.messageId, account, from, authUser: cfg.user };
}

/**
 * Subscriber / info emails must show From: info@ille.co.
 * 1) Auth as info@ille.co
 * 2) If that fails, auth as bookings but still From: info@ille.co (Send As)
 * Never fall back to From: bookings@ille.co for account=info.
 */
async function sendMail({ to, subject, html, text, account = 'bookings' }) {
  const payload = { to, subject, html, text };

  if (account !== 'info') {
    return sendMailOnce(account, payload);
  }

  // Attempt 1: login as info@ille.co
  try {
    transporters.info = null; // force fresh transporter (SMTP AUTH may have just been enabled)
    const result = await sendMailOnce('info', payload);
    return result;
  } catch (err) {
    console.error('[email] INFO SEND attempt1 (info login) FAILED', {
      to,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
      response: err.response,
      message: err.message,
    });
  }

  // Attempt 2: login as bookings, but keep From = info@ille.co
  if (!isConfigured('bookings')) {
    throw new Error('info@ille.co SMTP failed and bookings SMTP is not configured');
  }

  try {
    const result = await sendMailOnce('bookings', {
      ...payload,
      fromOverride: INFO_FROM,
    });
    return result;
  } catch (err) {
    console.error('[email] INFO SEND attempt2 FAILED (need Send As permission for info@ille.co)', {
      to,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
      response: err.response,
      message: err.message,
    });
    throw err;
  }
}

async function verifyInfoSmtp() {
  if (!isConfigured('info')) {
    return { ok: false, reason: 'not_configured' };
  }
  try {
    transporters.info = null;
    const t = getTransporter('info');
    await t.verify();
    return { ok: true };
  } catch (err) {
    console.error('[email] verifyInfoSmtp FAILED', {
      code: err.code,
      responseCode: err.responseCode,
      response: err.response,
      message: err.message,
    });
    return { ok: false, reason: err.message, code: err.code };
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
  // Welcome / subscribe confirmations from info@ille.co
  return sendMail({ to: email, subject, html, text, account: 'info' });
}

async function sendNewModelNotice(email, token, model) {
  const profileUrl = `${SITE_URL}/model/${encodeURIComponent(model.id)}`;
  const subject = `New model — ${model.name}`;
  const html = wrapHtml(`
    <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1a1a1a;">
      A new face joins ille
    </p>
    <p style="margin:0 0 14px 0;">We've just added a new model to our roster:</p>
    <p style="margin:0 0 14px 0;"><strong>${textToHtml(String(model.name || ''))}</strong></p>
    <p style="margin:0 0 14px 0;"><a href="${profileUrl}" style="color:#1a1a1a;">View profile →</a></p>
    <p style="margin:28px 0 0 0;">Warmly,<br><span style="letter-spacing:0.04em;">ille</span></p>
  `, token);
  const text = [
    'A new face joins ille',
    '',
    `We've just added a new model to our roster: ${model.name}`,
    '',
    `View profile: ${profileUrl}`,
    '',
    'Warmly,',
    'ille',
  ].join('\n');
  // New-model notices go out from info@ille.co
  try {
    return await sendMail({ to: email, subject, html, text, account: 'info' });
  } catch (err) {
    console.error('[email] sendNewModelNotice error', {
      to: email,
      message: err?.message,
      code: err?.code,
      response: err?.response,
      responseCode: err?.responseCode,
    });
    throw err;
  }
}

async function sendBroadcast(email, token, subject, message) {
  const html = wrapHtml(`<div>${textToHtml(message)}</div>`, token);
  const text = message;
  return sendMail({ to: email, subject, html, text, account: 'info' });
}

function extractEmail(data) {
  if (!data || typeof data !== 'object') return null;
  const direct = data.email;
  if (typeof direct === 'string' && EMAIL_RE.test(direct.trim())) return direct.trim();
  for (const [key, value] of Object.entries(data)) {
    if (/email/i.test(key) && typeof value === 'string' && EMAIL_RE.test(value.trim())) {
      return value.trim();
    }
  }
  for (const value of Object.values(data)) {
    if (typeof value === 'string' && EMAIL_RE.test(value.trim())) return value.trim();
  }
  return null;
}

function fieldRowsHtml(pairs) {
  return pairs
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) =>
      `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">${textToHtml(String(k))}</td>` +
      `<td style="padding:4px 0;">${textToHtml(String(v))}</td></tr>`,
    )
    .join('');
}

function formatSubmissionPairs(data, formFields) {
  const fields = Array.isArray(formFields) ? formFields : [];
  const used = new Set();
  const pairs = [];

  for (const field of fields) {
    if (!field || field.type === 'info' || !field.id) continue;
    const value = data?.[field.id];
    if (value == null || String(value).trim() === '') continue;
    pairs.push([field.label || field.id, value]);
    used.add(field.id);
  }

  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (used.has(key) || key.endsWith('_code')) continue;
      if (value == null || String(value).trim() === '') continue;
      pairs.push([key, value]);
    }
  }
  return pairs;
}

async function sendBookingNotification(booking, formFields) {
  const to = NOTIFY_TO;
  const name = booking.clientName || booking.company || booking.email || 'Unknown';
  const subject = `New booking enquiry — ${name}`;
  const pairs = formatSubmissionPairs(booking, formFields);
  const rows = fieldRowsHtml(pairs);
  const html = wrapHtml(`
    <p>A new booking enquiry has been submitted.</p>
    <table style="border-collapse:collapse;">${rows}</table>
  `);
  const text = [
    'New booking enquiry submitted.',
    '',
    ...pairs.map(([k, v]) => `${k}: ${v}`),
  ].join('\n');
  return sendMail({ to, subject, html, text });
}

async function sendApplicationNotification(application) {
  const to = NOTIFY_TO;
  const name = [application.firstName, application.lastName].filter(Boolean).join(' ') || 'Unknown';
  const subject = `New model application — ${name}`;
  const rows = fieldRowsHtml([
    ['Name', name],
    ['Email', application.email],
    ['Phone', application.phone],
    ['Date of Birth', application.dateOfBirth],
    ['Height', application.height],
    ['Instagram', application.instagram],
  ]);
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

async function sendCustomFormNotification(form, data) {
  const to = INFO_NOTIFY_TO;
  const title = form.title || 'Form';
  const subject = `New form submission — ${title}`;
  const pairs = formatSubmissionPairs(data, form.formFields);
  const rows = fieldRowsHtml(pairs);
  const html = wrapHtml(`
    <p>A new form has been submitted.</p>
    <p><strong>${textToHtml(String(title))}</strong></p>
    <table style="border-collapse:collapse;">${rows}</table>
  `);
  const text = [
    'New form submitted.',
    `Form: ${title}`,
    '',
    ...pairs.map(([k, v]) => `${k}: ${v}`),
  ].join('\n');
  return sendMail({ to, subject, html, text, account: 'info' });
}

async function sendServiceSubmissionNotification(service, data) {
  const to = INFO_NOTIFY_TO;
  const title = service.formTitle || service.title || 'Service enquiry';
  const subject = `New service enquiry — ${title}`;
  const pairs = formatSubmissionPairs(data, service.formFields);
  const rows = fieldRowsHtml(pairs);
  const html = wrapHtml(`
    <p>A new service form has been submitted.</p>
    <p><strong>${textToHtml(String(title))}</strong></p>
    <table style="border-collapse:collapse;">${rows}</table>
  `);
  const text = [
    'New service form submitted.',
    `Service: ${title}`,
    '',
    ...pairs.map(([k, v]) => `${k}: ${v}`),
  ].join('\n');
  return sendMail({ to, subject, html, text, account: 'info' });
}

async function sendFormConfirmation(toEmail, { kind, title, name } = {}) {
  if (!toEmail || !EMAIL_RE.test(toEmail)) {
    console.log('[email] skip confirmation — no valid recipient email');
    return { ok: false, skipped: true };
  }
  const useInfo = kind === 'service' || kind === 'form';
  const replyAddress = useInfo ? INFO_FROM : FROM;
  const label = title || (
    kind === 'application' ? 'model application'
      : kind === 'booking' ? 'booking enquiry'
        : 'request'
  );
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const subject = `We received your ${label} — ille`;
  const html = wrapHtml(`
    <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1a1a1a;">
      Thank you
    </p>
    <p style="margin:0 0 14px 0;">${textToHtml(greeting)}</p>
    <p style="margin:0 0 14px 0;">We've received your ${textToHtml(String(label))} and our team will be in touch shortly.</p>
    <p style="margin:0 0 14px 0;">If you have any questions in the meantime, reply to this email or write to us at ${textToHtml(replyAddress)}.</p>
    <p style="margin:28px 0 0 0;">Warmly,<br><span style="letter-spacing:0.04em;">ille</span></p>
  `);
  const text = [
    'Thank you',
    '',
    greeting,
    '',
    `We've received your ${label} and our team will be in touch shortly.`,
    '',
    `If you have any questions in the meantime, reply to this email or write to us at ${replyAddress}.`,
    '',
    'Warmly,',
    'ille',
  ].join('\n');
  return sendMail({
    to: toEmail,
    subject,
    html,
    text,
    account: useInfo ? 'info' : 'bookings',
  });
}

async function notifySubscribers(subscribers, sendFn) {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const sub of subscribers) {
    try {
      const result = await sendFn(sub);
      if (result?.skipped) {
        skipped++;
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      console.error('[email] notifySubscribers failed', {
        email: sub.email,
        message: err?.message,
        code: err?.code,
        response: err?.response,
      });
    }
  }
  return { sent, skipped, failed, total: subscribers.length };
}

module.exports = {
  isConfigured,
  siteUrl,
  generateToken,
  extractEmail,
  verifyInfoSmtp,
  sendWelcome,
  sendNewModelNotice,
  sendBroadcast,
  sendBookingNotification,
  sendApplicationNotification,
  sendServiceSubmissionNotification,
  sendCustomFormNotification,
  sendFormConfirmation,
  notifySubscribers,
};
