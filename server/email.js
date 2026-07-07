// email.js — outbound mail for newsletter subscriptions.
// Configure SMTP_* env vars to enable; otherwise logs and skips.

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const FROM = process.env.NEWSLETTER_FROM || 'newsletter@ille.co';
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
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function wrapHtml(bodyHtml, unsubscribeToken) {
  const footer = unsubscribeToken ? unsubscribeFooter(unsubscribeToken) : '';
  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  ${bodyHtml}
  ${footer}
</body></html>`;
}

function unsubscribeFooter(token) {
  const url = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return `<p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
    You're receiving this because you subscribed at ille.
    <a href="${url}" style="color:#888;">Unsubscribe</a>
  </p>`;
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
  await t.sendMail({ from: FROM, to, subject, html, text });
  return { ok: true };
}

async function sendWelcome(email, token, topic = 'models') {
  const isCommunity = topic === 'community';
  const subject = 'Welcome to ille updates';
  const html = wrapHtml(`
    <p>Thank you for subscribing to ille updates.</p>
    <p>${
      isCommunity
        ? "You'll hear from us when we publish new workshops and services."
        : "You'll hear from us when we add new faces to our roster."
    }</p>
  `, token);
  const text = isCommunity
    ? 'Thank you for subscribing to ille updates.\n\nYou\'ll hear from us when we publish new workshops and services.'
    : 'Thank you for subscribing to ille updates.\n\nYou\'ll hear from us when we add new models to our roster.';
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
  notifySubscribers,
};
