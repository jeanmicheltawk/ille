// formFields.js — normalize dynamic form definitions.
//
// Rule: a form never asks for date and time in one box. Any combined
// "Date & time" field (type `datetime`, or the legacy free-text "Dates" field
// on Book a Model) is split into two side-by-side fields — a Date picker and a
// Time picker — and every date / time field is mandatory.
//
// Idempotent: running it on already-normalized fields changes nothing.
// Keep in sync with src/app/core/form-datetime.util.ts.

function byOrder(a, b) {
  return (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0);
}

/** "Preferred date & time" -> ["Preferred date", "Preferred time"]. */
function splitLabels(label) {
  const text = String(label || '').trim();
  if (!text || /^(dates?|date\s*(?:&|and|\/|\+)\s*time|date\s*time)$/i.test(text)) {
    return ['Date', 'Time'];
  }
  const combined = /\bdate\s*(?:&|and|\/|\+)\s*time\b/i;
  if (combined.test(text)) {
    return [text.replace(combined, 'date'), text.replace(combined, 'time')];
  }
  const plural = /\bdates\b/i;
  if (plural.test(text)) {
    return [text.replace(plural, 'date'), text.replace(plural, 'time')];
  }
  return [`${text} — date`, `${text} — time`];
}

function isCombinedDateTime(field) {
  if (!field || typeof field !== 'object') return false;
  if (field.type === 'datetime') return true;
  // Legacy Book a Model field: free text "Dates" (e.g. "12–14 July").
  return field.id === 'dates' && field.type === 'text';
}

function normalizeFormFields(fields) {
  if (!Array.isArray(fields)) return [];
  const sorted = fields.filter((f) => f && typeof f === 'object').sort(byOrder);
  const out = [];
  const brokenRows = new Set();

  for (const field of sorted) {
    if (isCombinedDateTime(field)) {
      if (field.width === 'half' && field.rowGroup) brokenRows.add(field.rowGroup);
      const baseId = field.id === 'dates' ? 'booking' : field.id || `dt-${out.length}`;
      const suffix = field.id === 'dates' ? ['Date', 'Time'] : ['_date', '_time'];
      const [dateLabel, timeLabel] = splitLabels(field.label);
      const rowGroup = `${baseId}-datetime`;
      const { placeholder, options, ...rest } = field;
      out.push({ ...rest, id: `${baseId}${suffix[0]}`, type: 'date', label: dateLabel, width: 'half', rowGroup, required: true });
      out.push({ ...rest, id: `${baseId}${suffix[1]}`, type: 'time', label: timeLabel, width: 'half', rowGroup, required: true });
      continue;
    }
    if (field.type === 'date' || field.type === 'time') {
      out.push({ ...field, required: true });
      continue;
    }
    out.push(field);
  }

  // A half-width field that lost its row partner to the split goes full width.
  for (const group of brokenRows) {
    const members = out.filter((f) => f.rowGroup === group);
    if (members.length === 1) {
      members[0].width = 'full';
      delete members[0].rowGroup;
    }
  }

  return out.map((f, i) => ({ ...f, sortOrder: i }));
}

/** Human value for the legacy bookings.dates column. */
function combinedBookingDates(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.dates) return String(data.dates);
  const parts = [data.bookingDate, data.bookingTime].filter((v) => v != null && String(v).trim());
  return parts.length ? parts.join(' ') : null;
}

module.exports = { normalizeFormFields, combinedBookingDates };
