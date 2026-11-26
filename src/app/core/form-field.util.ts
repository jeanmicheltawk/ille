import { ServiceFormField } from './models.types';

/**
 * A form never asks for date and time in one box: any combined "Date & time"
 * field (type `datetime`, or the legacy free-text "Dates" field on Book a Model)
 * becomes two side-by-side fields — Date + Time — and every date / time field
 * is mandatory. Idempotent. Mirrors server/formFields.js.
 */
export function splitDateTimeLabels(label: string | undefined): [string, string] {
  const text = (label || '').trim();
  if (!text || /^(dates?|date\s*(?:&|and|\/|\+)\s*time|date\s*time)$/i.test(text)) return ['Date', 'Time'];
  const combined = /\bdate\s*(?:&|and|\/|\+)\s*time\b/i;
  if (combined.test(text)) return [text.replace(combined, 'date'), text.replace(combined, 'time')];
  const plural = /\bdates\b/i;
  if (plural.test(text)) return [text.replace(plural, 'date'), text.replace(plural, 'time')];
  return [`${text} — date`, `${text} — time`];
}

/** Two required half-width fields (Date + Time) sharing one row. */
export function dateTimePair(baseId: string, label: string | undefined, sortOrder = 0): ServiceFormField[] {
  const [dateLabel, timeLabel] = splitDateTimeLabels(label);
  const rowGroup = `${baseId}-datetime`;
  return [
    { id: `${baseId}_date`, type: 'date', label: dateLabel, width: 'half', rowGroup, sortOrder, required: true },
    { id: `${baseId}_time`, type: 'time', label: timeLabel, width: 'half', rowGroup, sortOrder: sortOrder + 1, required: true },
  ];
}

export function normalizeFormFields(fields: ServiceFormField[] | null | undefined): ServiceFormField[] {
  if (!Array.isArray(fields)) return [];
  const sorted = fields.filter((f) => !!f).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const out: ServiceFormField[] = [];
  const brokenRows = new Set<string>();

  for (const field of sorted) {
    const legacyDates = field.id === 'dates' && field.type === 'text';
    if (field.type === 'datetime' || legacyDates) {
      if (field.width === 'half' && field.rowGroup) brokenRows.add(field.rowGroup);
      const { placeholder: _p, options: _o, ...rest } = field;
      const pair = legacyDates
        ? [
            { ...rest, ...dateTimePair('booking', field.label)[0], id: 'bookingDate' },
            { ...rest, ...dateTimePair('booking', field.label)[1], id: 'bookingTime' },
          ]
        : dateTimePair(field.id, field.label).map((p) => ({ ...rest, ...p }));
      out.push(...pair);
      continue;
    }
    if (field.type === 'date' || field.type === 'time') {
      out.push({ ...field, required: true });
      continue;
    }
    out.push(field);
  }

  for (const group of brokenRows) {
    const members = out.filter((f) => f.rowGroup === group);
    if (members.length === 1) {
      members[0].width = 'full';
      delete members[0].rowGroup;
    }
  }

  return out.map((f, i) => ({ ...f, sortOrder: i }));
}

export function groupFormFields(fields: ServiceFormField[]): ServiceFormField[][] {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const rows: ServiceFormField[][] = [];
  const used = new Set<string>();

  for (const field of sorted) {
    if (used.has(field.id)) continue;
    if (field.width === 'half' && field.rowGroup) {
      const partner = sorted.find(
        (f) => f.id !== field.id && f.rowGroup === field.rowGroup && f.width === 'half' && !used.has(f.id),
      );
      if (partner) {
        rows.push([field, partner].sort((a, b) => a.sortOrder - b.sortOrder));
        used.add(field.id);
        used.add(partner.id);
        continue;
      }
    }
    rows.push([field]);
    used.add(field.id);
  }
  return rows;
}

export function submissionEntriesFromData(
  data: Record<string, string> | undefined,
  fields: ServiceFormField[],
): { label: string; value: string }[] {
  const payload = data || {};
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const field of sorted) {
    if (field.type === 'info' || seen.has(field.id)) continue;
    seen.add(field.id);
    const value = payload[field.id];
    if (value != null && String(value).trim()) {
      entries.push({ label: field.label || field.id, value: String(value) });
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (seen.has(key) || !String(value ?? '').trim()) continue;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
    entries.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: String(value) });
  }

  return entries;
}

export function displayTitleFromData(
  data: Record<string, string> | undefined,
  fallback: string,
): string {
  if (!data) return fallback;
  const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (data.clientName?.trim()) return data.clientName.trim();
  if (data.email?.trim()) return data.email.trim();
  return fallback;
}
